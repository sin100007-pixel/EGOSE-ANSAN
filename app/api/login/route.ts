// app/api/login/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { withSessionCookie } from "../../../lib/session";

export const runtime = "nodejs";
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, password } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ message: "이름/비밀번호를 입력하세요." }, { status: 400 });
    }

    // 1) 사용자 조회 (이름은 유일하다고 가정)
    const user = await prisma.user.findFirst({ where: { name } });
    if (!user) {
      return NextResponse.json({ message: "회원이 없습니다." }, { status: 401 });
    }

    // 2) 비밀번호 확인
    let ok = false;
    if (user.passwordHash) {
      ok = await bcrypt.compare(password, user.passwordHash);
    } else {
      ok = password === user.phoneLast4;
    }

    if (!ok) {
      return NextResponse.json({ message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    // 3) 응답 + 세션 쿠키
    const res = NextResponse.json({ ok: true });
    withSessionCookie(res, { uid: user.id, name: user.name });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
