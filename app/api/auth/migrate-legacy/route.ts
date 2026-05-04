// app/api/auth/migrate-legacy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueAuthCookies, LEGACY_COOKIE_NAME } from "@/lib/auth-tokens";

export const runtime = "nodejs";

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export async function POST(req: NextRequest) {
  try {
    const legacyCookie = req.cookies.get(LEGACY_COOKIE_NAME)?.value;

    if (!legacyCookie) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "NO_LEGACY_COOKIE",
      });
    }

    const legacyName = safeDecodeCookieValue(legacyCookie);

    if (!legacyName) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "EMPTY_LEGACY_COOKIE",
      });
    }

    const user = await prisma.user.findFirst({
      where: { name: legacyName },
    });

    if (!user) {
      return NextResponse.json({
        ok: true,
        migrated: false,
        reason: "USER_NOT_FOUND",
      });
    }

    const res = NextResponse.json({
      ok: true,
      migrated: true,
    });

    await issueAuthCookies(
      res,
      {
        uid: user.id,
        name: user.name,
        role: user.role ?? "USER",
        memberType: user.memberType ?? "INSTALLER",
      },
      {
        userAgent: req.headers.get("user-agent"),
        keepLegacyCookie: true,
      }
    );

    return res;
  } catch (e) {
    console.error("[migrate-legacy] error", e);

    return NextResponse.json({
      ok: false,
      migrated: false,
      reason: "SERVER_ERROR",
    });
  }
}