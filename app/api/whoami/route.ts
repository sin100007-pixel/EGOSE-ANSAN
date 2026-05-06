import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  verifyAccessToken,
} from "@/lib/auth-tokens";

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function GET() {
  const jar = cookies();

  const accessToken = jar.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const session = await verifyAccessToken(accessToken);
    if (session?.name) {
      return NextResponse.json({
        ok: true,
        name: session.name,
        role: session.role,
        memberType: session.memberType,
      });
    }
  }

  // 보안패치 유예기간용: 기존 자동로그인 쿠키도 이름 확인에 사용
  const legacyRaw = jar.get(LEGACY_COOKIE_NAME)?.value || "";
  const legacyName = legacyRaw ? safeDecodeCookieValue(legacyRaw) : "";

  return NextResponse.json({ ok: true, name: legacyName });
}
