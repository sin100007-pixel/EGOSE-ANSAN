// app/api/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clearAuthCookies,
  hashRefreshToken,
  REFRESH_COOKIE_NAME,
} from "@/lib/auth-tokens";

export const runtime = "nodejs";

async function revokeRefreshSession(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return;

  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.authSession.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

/** POST /api/logout -> /logout 로 리다이렉트 */
export async function POST(req: NextRequest) {
  try {
    await revokeRefreshSession(req);
  } catch (e) {
    console.error("[logout] revoke failed", e);
  }

  const res = NextResponse.redirect(new URL("/logout", req.url), 302);
  clearAuthCookies(res);
  return res;
}

/** GET /api/logout -> /logout 로 리다이렉트 */
export async function GET(req: NextRequest) {
  try {
    await revokeRefreshSession(req);
  } catch (e) {
    console.error("[logout] revoke failed", e);
  }

  const res = NextResponse.redirect(new URL("/logout", req.url), 302);
  clearAuthCookies(res);
  return res;
}