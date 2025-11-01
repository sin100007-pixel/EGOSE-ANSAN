import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/session"; // 사용중인 세션 유틸 경로 그대로

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { name, phoneLast4, password } = await req.json();

  // 1) 사용자 조회 (이름 + 전화 뒷자리)
  const user = await prisma.user.findFirst({
    where: { name, phoneLast4 },
  });
  if (!user) {
    return NextResponse.json({ message: "존재하지 않는 사용자입니다." }, { status: 401 });
  }

  // 2) 비밀번호 방식이 설정된 사용자라면 비밀번호 검증
  if (user.passwordHash) {
    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json({ message: "비밀번호가 필요합니다." }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
  }
  // 3) passwordHash가 없으면(=우리 기본 정책) 이름+뒷자리로만 로그인 통과

  await setSession({ uid: user.id, name: user.name });
  return NextResponse.json({ ok: true });
}
