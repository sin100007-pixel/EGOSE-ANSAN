// lib/session.ts
import { NextResponse } from "next/server";

type SessionPayload = { uid: string; name: string };

// 응답에 직접 쿠키를 심는다 (Vercel 배포 도메인에서 안전한 기본값)
export function withSessionCookie(res: NextResponse, payload: SessionPayload) {
  res.cookies.set("session_user", encodeURIComponent(payload.name), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });
  return res;
}
