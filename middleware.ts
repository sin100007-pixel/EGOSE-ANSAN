// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_COOKIE_NAME = "egose_session";
const REFRESH_COOKIE_NAME = "egose_refresh";
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
  "/api/ledger-upload-dates",
  "/api/ledger-clear",
  "/api/dbcheck",
];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}


function isPublicStaticAssetPath(pathname: string) {
  // public/simulator 안의 PNG/JPG/WEBP/SVG 같은 정적 파일은
  // 고객 공유 링크에서도 로그인 없이 열려야 합니다.
  return (
    pathname.startsWith("/simulator/") &&
    /\.(?:png|jpe?g|webp|gif|svg|avif|ico|bmp|css|js|map|txt|json|woff2?|ttf|otf)$/i.test(pathname)
  );
}

function isPublicPath(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname.startsWith("/simulator/share")) return true;

  // 예전/대체 고객 링크 형식인 /simulator?token=... 도 로그인 없이 열려야 합니다.
  // app/simulator/page.tsx는 token query가 있으면 고객 모드로 렌더링합니다.
  if (pathname === "/simulator" && searchParams.get("token")) return true;

  if (isPublicStaticAssetPath(pathname)) return true;

  if (
    pathname === "/api/simulator/bootstrap" &&
    (req.method === "GET") &&
    (searchParams.get("token") || searchParams.get("__kakao_image_proxy") === "1")
  ) {
    return true;
  }

  // 고객 공유 링크에서는 로그인 쿠키가 없어도 필름 검색 API를 열어줘야 합니다.
  // API 내부에서 token 유효성/만료/허용 필름 범위를 다시 검증합니다.
  if (
    pathname === "/api/simulator/films" &&
    req.method === "GET" &&
    searchParams.get("token")
  ) {
    return true;
  }

  return false;
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  const originalPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;

  url.pathname = "/";
  url.search = "";

  if (originalPath !== "/") {
    url.searchParams.set("next", originalPath);
  }

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
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const legacyCookie = req.cookies.get(LEGACY_COOKIE_NAME)?.value;

  const session = await verifyAccessToken(accessToken);

  const hasRefreshSession = Boolean(refreshToken);
  const hasLegacySession = Boolean(legacyCookie);

  // 관리자 영역은 새 egose_session 토큰의 ADMIN 권한만 인정
  if (needsAdmin) {
    if (session?.role === "ADMIN") {
      return NextResponse.next();
    }

    // access token은 없지만 refresh token이 있으면
    // 로그인 화면으로 보내고 SessionHydrator가 자동 갱신 후 원래 주소로 복귀
    if (!session && hasRefreshSession && isAdminPage) {
      return redirectToLogin(req);
    }

    if (isAdminApi) {
      return forbiddenJson();
    }

    return redirectToLogin(req);
  }

  // 일반 보호 영역: 새 access token 있으면 통과
  if (session) {
    return NextResponse.next();
  }

  // access token은 없지만 refresh token이 있으면
  // 로그인 화면에서 자동 갱신 후 원래 페이지로 복귀
  if (hasRefreshSession && isProtectedPage) {
    return redirectToLogin(req);
  }

  // 유예기간: 기존 session_user 쿠키가 있으면 일반 페이지와 일반 사용자 API는 임시 허용
  // 거래내역(/ledger)은 화면은 통과해도 API가 막히면 표가 비어 보이므로,
  // /api/my-ledger 같은 사용자 API도 legacy 쿠키 기간에는 허용한다.
  if (hasLegacySession && (isProtectedPage || isUserApi)) {
    const res = NextResponse.next();
    return extendLegacyCookie(req, res);
  }

  if (isUserApi) {
    return unauthorizedJson();
  }

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
    "/api/ledger-upload-dates",
    "/api/ledger-clear",
    "/api/dbcheck",
  ],
};