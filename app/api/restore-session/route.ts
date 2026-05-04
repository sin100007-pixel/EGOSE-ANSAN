// app/api/restore-session/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const isProduction = process.env.NODE_ENV === "production";

function disabledRestoreSession() {
  const res = NextResponse.json(
    {
      ok: false,
      message: "restore-session is disabled. Please use normal login.",
    },
    { status: 410 }
  );

  // 혹시 남아 있는 유예기간 쿠키도 이 경로를 호출하면 제거한다.
  res.cookies.set("session_user", "", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 0,
  });

  return res;
}

export async function POST() {
  return disabledRestoreSession();
}

export async function GET() {
  return disabledRestoreSession();
}
