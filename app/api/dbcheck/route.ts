// app/api/dbcheck/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<{ now: Date }[]>`SELECT now()`;
    const now = rows?.[0]?.now ?? null;
    return NextResponse.json({ status: "ok", now }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: e?.message ?? "unknown" },
      { status: 500 }
    );
  }
}
