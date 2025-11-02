// app/api/logout/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** 공통: 세션 쿠키 삭제 */
function clearSessionCookie(res: NextResponse) {
  res.cookies.set("session_user", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0, // 즉시 만료
  });
}

/** POST /api/logout -> 세션 삭제 후 / 로 리다이렉트 */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 302);
  clearSessionCookie(res);
  return res;
}

/** GET /api/logout -> 직접 주소로 들어와도 동일하게 처리 */
export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/", req.url), 302);
  clearSessionCookie(res);
  return res;
}