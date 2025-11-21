// app/api/pageview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// ✅ session_user 쿠키에서 한글 이름 꺼내기
function getUserNameFromCookie(): string | null {
  // Next.js가 이미 한 번 디코딩한 값을 돌려줌
  const cookieStore = cookies();
  const session = cookieStore.get("session_user");
  if (!session?.value) return null;

  const raw = session.value; // encodeURIComponent(이름) 상태

  try {
    // 여기서 한 번 더 풀어주면 사람이 읽을 수 있는 "홍길동" 형태가 됨
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function detectDeviceType(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  if (ua.includes("windows")) {
    return "windows";
  }
  if (ua.includes("mac os x") || ua.includes("macintosh")) {
    return "macos";
  }
  if (ua.includes("linux")) {
    return "linux";
  }
  return "other";
}

export async function POST(req: Request) {
  try {
    const { path } = await req.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { ok: false, message: "path 가 비어 있습니다." },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || "";
    const forwardedFor =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "";
    const ip =
      forwardedFor
        .split(",")[0]
        .trim() || null;
    const deviceType = detectDeviceType(userAgent);

    const userName = getUserNameFromCookie(); // ✅ 여기서 디코딩된 이름 가져오기

    await prisma.pageView.create({
      data: {
        path,
        deviceType,
        userAgent,
        ip,
        userName, // "원철 신" 이런 식으로 그대로 저장됨
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pageview insert error", err);
    return NextResponse.json(
      { ok: false, message: "server error" },
      { status: 500 }
    );
  }
}
