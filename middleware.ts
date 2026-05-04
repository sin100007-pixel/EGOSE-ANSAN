// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE_NAME = "egose_session";
const LEGACY_COOKIE_NAME = "session_user";

const isProduction = process.env.NODE_ENV === "production";

type EdgeSessionPayload = {
  uid: string;
  name: string;
  role: string;
  memberType: string;
};

const PAGE_PROTECTED_PREFIXES = [
  "/dashboard",
  "/ledger",
  "/product-test",
  "/products",
  "/simulator",
];

const ADMIN_PAGE_PREFIXES = ["/admin"];

const USER_API_PREFIXES = [
  "/api/my-ledger",
  "/api/products/search",
  "/api/simulator/links",
  "/api/simulator/presets",
  "/api/simulator/films",
  "/api/simulator/contractor-profile",
  "/api/simulator/contractor-upload",
];

const ADMIN_API_PREFIXES = [
  "/api/ledger-search",
  "/api/ledger-import",
  "/api/ledger-clear",
  "/api/dbcheck",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function isPublicPath(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // 고객 공유 링크는 공개 유지
  if (pathname.startsWith("/simulator/share")) return true;

  // 고객 공유 링크에서 쓰는 bootstrap token 조회는 공개 유지
  if (
    pathname === "/api/simulator/bootstrap" &&
    searchParams.get("token")
  ) {
    return true;
  }

  return false;
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

function unauthorizedJson(message = "로그인이 필요합니다.") {
  return NextResponse.json({ message }, { status: 401 });
}

function forbiddenJson(message = "관리자 권한이 필요합니다.") {
  return NextResponse.json({ message }, { status: 403 });
}

async function verifyAccessToken(
  token: string | undefined
): Promise<EdgeSessionPayload | null> {
  if (!token) return null;

  const secretText = process.env.APP_SECRET;
  if (!secretText) return null;

  try {
    const secret = new TextEncoder().encode(secretText);
    const { payload } = await jwtVerify(token, secret);

    if (
      typeof payload.uid !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.memberType !== "string"
    ) {
      return null;
    }

    return {
      uid: payload.uid,
      name: payload.name,
      role: payload.role,
      memberType: payload.memberType,
    };
  } catch {
    return null;
  }
}

function extendLegacyCookie(req: NextRequest, res: NextResponse) {
  const legacy = req.cookies.get(LEGACY_COOKIE_NAME)?.value;
  if (!legacy) return res;

  // 유예기간용: 기존 자동로그인 쿠키를 30일로 연장
  res.cookies.set(LEGACY_COOKIE_NAME, legacy, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(req)) {
    return NextResponse.next();
  }

  const isAdminPage = startsWithAny(pathname, ADMIN_PAGE_PREFIXES);
  const isAdminApi = startsWithAny(pathname, ADMIN_API_PREFIXES);
  const isProtectedPage = startsWithAny(pathname, PAGE_PROTECTED_PREFIXES);
  const isUserApi = startsWithAny(pathname, USER_API_PREFIXES);

  const needsAdmin = isAdminPage || isAdminApi;
  const needsLogin = needsAdmin || isProtectedPage || isUserApi;

  if (!needsLogin) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessToken(accessToken);

  const legacyCookie = req.cookies.get(LEGACY_COOKIE_NAME)?.value;
  const hasLegacySession = Boolean(legacyCookie);

  // 관리자 영역은 새 egose_session 토큰의 role이 ADMIN이어야만 허용
  if (needsAdmin) {
    if (session?.role === "ADMIN") {
      return NextResponse.next();
    }

    if (isAdminApi) {
      return forbiddenJson();
    }

    return redirectToLogin(req);
  }

  // 일반 보호 영역: 새 토큰이 있으면 허용
  if (session) {
    return NextResponse.next();
  }

  // 유예기간: 기존 session_user 쿠키가 있으면 임시 허용
  if (hasLegacySession) {
    const res = NextResponse.next();
    return extendLegacyCookie(req, res);
  }

  // API는 JSON 응답
  if (isUserApi) {
    return unauthorizedJson();
  }

  // 페이지는 로그인 화면으로 이동
  return redirectToLogin(req);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ledger/:path*",
    "/product-test/:path*",
    "/products/:path*",
    "/simulator/:path*",
    "/admin/:path*",

    "/api/my-ledger",
    "/api/products/search",
    "/api/simulator/:path*",

    "/api/ledger-search",
    "/api/ledger-import",
    "/api/ledger-clear",
    "/api/dbcheck",
  ],
};