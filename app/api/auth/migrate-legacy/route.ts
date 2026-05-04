// app/api/auth/migrate-legacy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  issueAuthCookies,
  REFRESH_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
} from "@/lib/auth-tokens";

export const runtime = "nodejs";

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function POST(req: NextRequest) {
  try {
    // 이미 새 refresh 쿠키가 있으면 승계할 필요 없음
    const existingRefresh = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (existingRefresh) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "ALREADY_HAS_REFRESH",
      });
    }

    // 기존 자동로그인 쿠키 확인
    const legacyCookie = req.cookies.get(LEGACY_COOKIE_NAME)?.value;
    if (!legacyCookie) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "NO_LEGACY_COOKIE",
      });
    }

    const legacyName = safeDecodeCookieValue(legacyCookie);

    if (!legacyName) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "EMPTY_LEGACY_COOKIE",
      });
    }

    const user = await prisma.user.findFirst({
      where: { name: legacyName },
    });

    if (!user) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "USER_NOT_FOUND",
      });
    }

    const res = NextResponse.json({
      ok: true,
      migrated: true,
    });

    // 중요:
    // 아직 유예기간이므로 기존 session_user도 유지합니다.
    // 다음 단계에서 middleware가 새 egose_session을 완전히 인식하게 만든 뒤 제거합니다.
    await issueAuthCookies(
      res,
      {
        uid: user.id,
        name: user.name,
        role: user.role ?? "USER",
        memberType: user.memberType ?? "INSTALLER",
      },
      {
        userAgent: req.headers.get("user-agent"),
        keepLegacyCookie: true,
      }
    );

    return res;
  } catch (e) {
    console.error("[migrate-legacy] error", e);

    // 승계 실패가 앱 사용을 막으면 안 되므로 200으로 조용히 실패 처리
    return NextResponse.json({
      ok: false,
      migrated: false,
      reason: "SERVER_ERROR",
    });
  }
}