// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  clearAuthCookies,
  hashRefreshToken,
  issueAccessCookieOnly,
  makeExpiresAt,
  setRefreshCookie,
  verifyAccessToken,
} from "@/lib/auth-tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 이미 egose_session이 살아 있으면 굳이 access를 다시 발급하지 않음
    const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
    if (accessToken) {
      const currentSession = await verifyAccessToken(accessToken);

      if (currentSession) {
        return NextResponse.json({
          ok: true,
          refreshed: false,
          refreshExtended: false,
          reason: "ACCESS_STILL_VALID",
        });
      }
    }

    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json({
        ok: true,
        refreshed: false,
        refreshExtended: false,
        reason: "NO_REFRESH_TOKEN",
      });
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    const authSession = await prisma.authSession.findUnique({
      where: {
        refreshTokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!authSession) {
      return NextResponse.json(
        {
          ok: false,
          refreshed: false,
          refreshExtended: false,
          reason: "SESSION_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (authSession.revokedAt) {
      return NextResponse.json(
        {
          ok: false,
          refreshed: false,
          refreshExtended: false,
          reason: "SESSION_REVOKED",
        },
        { status: 401 }
      );
    }

    if (authSession.expiresAt.getTime() <= Date.now()) {
      const res = NextResponse.json(
        {
          ok: false,
          refreshed: false,
          refreshExtended: false,
          reason: "SESSION_EXPIRED",
        },
        { status: 401 }
      );

      clearAuthCookies(res);
      return res;
    }

    const user = authSession.user;

    const res = NextResponse.json({
      ok: true,
      refreshed: true,
      refreshExtended: true,
      refreshMaxAgeSeconds: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });

    // egose_session 재발급
    await issueAccessCookieOnly(res, {
      uid: user.id,
      name: user.name,
      role: user.role ?? "USER",
      memberType: user.memberType ?? "INSTALLER",
    });

    // refresh 자동연장: DB 만료일과 브라우저 쿠키 만료시간을 다시 180일로 밀어줌
    await prisma.authSession.update({
      where: { id: authSession.id },
      data: {
        expiresAt: makeExpiresAt(REFRESH_TOKEN_MAX_AGE_SECONDS),
      },
    });

    setRefreshCookie(res, refreshToken);

    return res;
  } catch (e) {
    console.error("[auth/refresh] error", e);

    return NextResponse.json(
      {
        ok: false,
        refreshed: false,
        refreshExtended: false,
        reason: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
