// lib/server-auth.ts
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  verifyAccessToken,
} from "@/lib/auth-tokens";

export type CurrentEgoseUser = {
  id: string;
  name: string;
  qrUrl: string;
  role: string;
  memberType: string;
  canUseSimulator: boolean;
};

type CurrentEgoseUserRow = {
  id: string;
  name: string;
  qrUrl: string;
  role: string;
  memberType: string;
  simulator_access: string | null;
};

function toCurrentEgoseUser(user: CurrentEgoseUserRow): CurrentEgoseUser {
  return {
    id: user.id,
    name: user.name,
    qrUrl: user.qrUrl,
    role: user.role,
    memberType: user.memberType,
    canUseSimulator: user.simulator_access === "y",
  };
}

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function getCurrentEgoseUser(): Promise<CurrentEgoseUser | null> {
  const jar = cookies();

  // 1) 새 보안 쿠키 우선
  const accessToken = jar.get(ACCESS_COOKIE_NAME)?.value;
  if (accessToken) {
    const session = await verifyAccessToken(accessToken);

    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.uid },
        select: {
          id: true,
          name: true,
          qrUrl: true,
          role: true,
          memberType: true,
          simulator_access: true,
        },
      });

      if (user) return toCurrentEgoseUser(user);
    }
  }

  // 2) 유예기간용 기존 쿠키 fallback
  const legacyCookie = jar.get(LEGACY_COOKIE_NAME)?.value;
  if (!legacyCookie) return null;

  const legacyName = safeDecodeCookieValue(legacyCookie);
  if (!legacyName) return null;

  const user = await prisma.user.findFirst({
    where: { name: legacyName },
    select: {
      id: true,
      name: true,
      qrUrl: true,
      role: true,
      memberType: true,
      simulator_access: true,
    },
  });

  return user ? toCurrentEgoseUser(user) : null;
}
