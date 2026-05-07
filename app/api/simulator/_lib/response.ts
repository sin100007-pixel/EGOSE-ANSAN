import { NextResponse } from "next/server";

export const KAKAO_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie, Authorization, User-Agent",
};

export function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...KAKAO_NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}
