// lib/auth-tokens.ts
import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const ACCESS_COOKIE_NAME = "egose_session";
export const REFRESH_COOKIE_NAME = "egose_refresh";
export const LEGACY_COOKIE_NAME = "session_user";

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7일
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180일

const isProduction = process.env.NODE_ENV === "production";

const secretText = process.env.APP_SECRET;

if (!secretText) {
  throw new Error("APP_SECRET 환경변수가 없습니다.");
}

const secret = new TextEncoder().encode(secretText);

export type EgoseSessionPayload = {
  uid: string;
  name: string;
  role: string;
  memberType: string;
};

export function makeExpiresAt(seconds: number) {
  return new Date(Date.now() + seconds * 1000);
}

export function setRefreshCookie(res: NextResponse, refreshToken: string) {
  res.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });

  return res;
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export async function createAccessToken(payload: EgoseSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(
  token: string
): Promise<EgoseSessionPayload | null> {
  try {
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

/**
 * egose_session만 발급한다.
 * refresh 자동연장 때 사용한다.
 */
export async function issueAccessCookieOnly(
  res: NextResponse,
  payload: EgoseSessionPayload
) {
  const accessToken = await createAccessToken(payload);

  res.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  return res;
}

/**
 * 로그인/기존 자동로그인 승계 때 사용한다.
 * egose_session + egose_refresh 둘 다 발급하고 auth_sessions에 기록한다.
 */
export async function issueAuthCookies(
  res: NextResponse,
  payload: EgoseSessionPayload,
  options?: {
    userAgent?: string | null;
    keepLegacyCookie?: boolean;
  }
) {
  await issueAccessCookieOnly(res, payload);

  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  await prisma.authSession.create({
    data: {
      userId: payload.uid,
      refreshTokenHash,
      userAgent: options?.userAgent ?? null,
      expiresAt: makeExpiresAt(REFRESH_TOKEN_MAX_AGE_SECONDS),
    },
  });

  setRefreshCookie(res, refreshToken);

  // 유예기간용: 기존 자동로그인도 잠깐 유지
  if (options?.keepLegacyCookie) {
    res.cookies.set(LEGACY_COOKIE_NAME, encodeURIComponent(payload.name), {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}

export function clearAuthCookies(res: NextResponse) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 0,
  };

  res.cookies.set(ACCESS_COOKIE_NAME, "", cookieOptions);
  res.cookies.set(REFRESH_COOKIE_NAME, "", cookieOptions);
  res.cookies.set(LEGACY_COOKIE_NAME, "", cookieOptions);

  return res;
}