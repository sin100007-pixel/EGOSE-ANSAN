// app/api/pageview/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  verifyAccessToken,
} from "@/lib/auth-tokens";
import {
  extractSimulatorLinkToken,
  readSimulatorLinkInfoByToken,
} from "@/lib/simulator-pageview-link";

export const runtime = "nodejs";

function safeDecodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

// ✅ 새 로그인 쿠키(egose_session)를 먼저 확인하고, 없을 때만 기존 session_user를 사용합니다.
async function getUserNameFromCookie(): Promise<string | null> {
  const cookieStore = cookies();

  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const session = await verifyAccessToken(accessToken);
    const sessionName = session?.name?.trim();

    if (sessionName) {
      return sessionName;
    }
  }

  // 보안패치 유예기간용: 예전 자동로그인 쿠키만 남아 있는 사용자도 이름을 기록합니다.
  const legacyRaw = cookieStore.get(LEGACY_COOKIE_NAME)?.value;
  if (!legacyRaw) return null;

  const legacyName = safeDecodeCookieValue(legacyRaw);
  return legacyName || null;
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

function cleanLogPath(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  // /dashboard?__egose_pwa_cache_reset=... 또는 /?source=pwa 처럼
  // 캐시/실행 출처 확인용 query가 붙어도 관리자 로그에는 pathname만 저장합니다.
  try {
    const url = raw.startsWith("/")
      ? new URL(raw, "https://egose.local")
      : new URL(raw);

    return url.pathname || "/";
  } catch {
    const withoutHash = raw.split("#")[0] || "";
    const withoutQuery = withoutHash.split("?")[0] || "/";
    return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  }
}

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    const cleanPath = cleanLogPath(path);

    if (!cleanPath) {
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

    const userName = await getUserNameFromCookie(); // ✅ 여기서 로그인 사용자 이름 가져오기
    const simulatorToken = extractSimulatorLinkToken(path);
    const simulatorLinkInfo = await readSimulatorLinkInfoByToken(simulatorToken);

    const baseData = {
      path: cleanPath,
      deviceType,
      userAgent,
      ip,
      userName, // "원철 신" 이런 식으로 그대로 저장됨
    };

    try {
      await prisma.pageView.create({
        data: {
          ...baseData,
          simulatorToken: simulatorLinkInfo?.token || simulatorToken,
          simulatorInstallerName: simulatorLinkInfo?.installerName || null,
          simulatorCustomerName: simulatorLinkInfo?.customerName || null,
          simulatorMemo: simulatorLinkInfo?.memo || null,
        },
        select: { id: true },
      });
    } catch (err) {
      // DB에 새 컬럼을 아직 추가하지 않은 상태에서도 방문 로그 저장 자체는 막히지 않게 합니다.
      console.error("pageview insert with simulator link info failed", err);
      await prisma.pageView.create({
        data: baseData,
        select: { id: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("pageview insert error", err);
    return NextResponse.json(
      { ok: false, message: "server error" },
      { status: 500 }
    );
  }
}
