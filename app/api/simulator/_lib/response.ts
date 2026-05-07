import { NextRequest, NextResponse } from "next/server";

export const PROBLEM_BROWSER_UA_RE = /KAKAOTALK|SamsungBrowser|Whale|NAVER|FB_IAB|Instagram|; wv\)/i;

export const KAKAO_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie, Authorization, User-Agent",
};

export const SIMULATOR_BROWSER_CACHE_HEADERS = {
  // 일반 Chrome/Edge에서는 같은 화면 재진입 시 브라우저 캐시를 짧게 활용합니다.
  // 고객 링크/시공자 세션 응답이라 CDN 공유 캐시는 쓰지 않고 private만 허용합니다.
  "Cache-Control": "private, max-age=20, stale-while-revalidate=60",
  Vary: "Cookie, Authorization, User-Agent",
};

export function isProblemImageBrowserRequest(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  return PROBLEM_BROWSER_UA_RE.test(userAgent);
}

export function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...KAKAO_NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

export function jsonSimulatorCache(req: NextRequest, body: unknown, init: ResponseInit = {}) {
  const baseHeaders = isProblemImageBrowserRequest(req)
    ? KAKAO_NO_STORE_HEADERS
    : SIMULATOR_BROWSER_CACHE_HEADERS;

  return NextResponse.json(body, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers || {}),
    },
  });
}
