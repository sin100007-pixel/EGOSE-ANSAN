import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PRODUCT_SELECT = `
  id,
  manufacturer,
  product_code_1,
  product_code_2,
  color_name,
  full_name,
  category_main,
  category_sub,
  image_path,
  non_fire_consumer_price,
  fire_consumer_price,
  non_fire_installer_price,
  fire_installer_price,
  non_fire_dealer_price,
  fire_dealer_price
`;

type ProductRow = {
  id: number;
  manufacturer: string | null;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  image_path: string | null;
  non_fire_consumer_price: number | null;
  fire_consumer_price: number | null;
  non_fire_installer_price: number | null;
  fire_installer_price: number | null;
  non_fire_dealer_price: number | null;
  fire_dealer_price: number | null;
};

type MemberType = "INSTALLER" | "DEALER";

function normalizeForSearch(value: string) {
  return value
    .toUpperCase()
    .replace(/번/g, "")
    .replace(/[^0-9A-Z가-힣]/g, "");
}

function buildCodeTokens(code: string | null | undefined) {
  if (!code) return [];

  const tokens = new Set<string>();
  const normalized = normalizeForSearch(code);

  if (normalized) {
    tokens.add(normalized);
  }

  const parts = (code.toUpperCase().match(/[A-Z가-힣]+|\d+/g) || []).map((part) =>
    normalizeForSearch(part)
  );

  const letterParts = parts.filter((part) => /[A-Z가-힣]/.test(part));
  const numberParts = parts.filter((part) => /\d/.test(part));

  for (const numberPart of numberParts) {
    tokens.add(numberPart);

    for (const letterPart of letterParts) {
      tokens.add(`${letterPart}${numberPart}`);
    }

    if (letterParts.length > 1) {
      tokens.add(`${letterParts.join("")}${numberPart}`);
    }
  }

  return Array.from(tokens).filter(Boolean);
}

function buildQueryTokens(query: string) {
  const tokens = new Set<string>();
  const normalized = normalizeForSearch(query);

  if (normalized) {
    tokens.add(normalized);
  }

  const parts = (query.toUpperCase().match(/[A-Z가-힣]+|\d+/g) || [])
    .map((part) => normalizeForSearch(part))
    .filter(Boolean);

  for (const part of parts) {
    tokens.add(part);
  }

  const letterParts = parts.filter((part) => /[A-Z가-힣]/.test(part));
  const numberParts = parts.filter((part) => /\d/.test(part));

  for (const numberPart of numberParts) {
    tokens.add(numberPart);

    for (const letterPart of letterParts) {
      tokens.add(`${letterPart}${numberPart}`);
    }

    if (letterParts.length > 1) {
      tokens.add(`${letterParts.join("")}${numberPart}`);
    }
  }

  if (parts.length > 1) {
    tokens.add(parts.join(""));
  }

  return Array.from(tokens)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
}

function buildDbOrFilter(query: string) {
  const tokens = buildQueryTokens(query);
  const searchableFields = [
    "product_code_1",
    "product_code_2",
    "full_name",
    "color_name",
    "category_main",
    "category_sub",
  ];

  const conditions: string[] = [];

  for (const token of tokens) {
    const safeToken = token.replace(/[%_,()]/g, "").trim();
    if (!safeToken) continue;

    for (const field of searchableFields) {
      conditions.push(`${field}.ilike.%${safeToken}%`);
    }
  }

  return conditions.join(",");
}

function getSearchScore(item: ProductRow, query: string) {
  const queryNorm = normalizeForSearch(query);
  if (!queryNorm) return 0;

  const codeTokens = [
    ...buildCodeTokens(item.product_code_1),
    ...buildCodeTokens(item.product_code_2),
  ];

  const uniqueCodeTokens = Array.from(new Set(codeTokens));

  const fieldNorms = [
    normalizeForSearch(item.product_code_1 || ""),
    normalizeForSearch(item.product_code_2 || ""),
    normalizeForSearch(item.full_name || ""),
    normalizeForSearch(item.color_name || ""),
    normalizeForSearch(item.category_main || ""),
    normalizeForSearch(item.category_sub || ""),
  ].filter(Boolean);

  let score = 0;

  for (const token of uniqueCodeTokens) {
    if (token === queryNorm) score = Math.max(score, 100);
    else if (token.startsWith(queryNorm)) score = Math.max(score, 90);
    else if (token.includes(queryNorm)) score = Math.max(score, 80);
  }

  for (const field of fieldNorms) {
    if (field === queryNorm) score = Math.max(score, 70);
    else if (field.startsWith(queryNorm)) score = Math.max(score, 60);
    else if (field.includes(queryNorm)) score = Math.max(score, 50);
  }

  return score;
}

function normalizeMemberType(value: string | null | undefined): MemberType {
  const upper = (value || "").toUpperCase();

  if (upper === "DEALER") {
    return "DEALER";
  }

  return "INSTALLER";
}

function applyVisiblePrices(item: ProductRow, memberType: MemberType) {
  return {
    ...item,

    non_fire_consumer_price: item.non_fire_consumer_price,
    fire_consumer_price: item.fire_consumer_price,

    non_fire_installer_price:
      memberType === "INSTALLER" ? item.non_fire_installer_price : null,
    fire_installer_price:
      memberType === "INSTALLER" ? item.fire_installer_price : null,

    non_fire_dealer_price:
      memberType === "DEALER" ? item.non_fire_dealer_price : null,
    fire_dealer_price:
      memberType === "DEALER" ? item.fire_dealer_price : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const rawSessionUser = req.cookies.get("session_user")?.value || "";
    const sessionUserName = rawSessionUser
      ? decodeURIComponent(rawSessionUser).trim()
      : "";

    if (!sessionUserName) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", items: [] },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { name: sessionUserName },
      select: { memberType: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "회원 정보를 찾을 수 없습니다.", items: [] },
        { status: 401 }
      );
    }

    const memberType = normalizeMemberType(user.memberType);
    const orFilter = buildDbOrFilter(q);

    if (!orFilter) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .or(orFilter)
      .limit(1000);

    if (error) {
      return NextResponse.json(
        { error: error.message, items: [] },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    const items = (data || [])
      .map((item) => ({
        item: applyVisiblePrices(item as ProductRow, memberType),
        score: getSearchScore(item as ProductRow, q),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        const aName = a.item.full_name || a.item.product_code_1 || "";
        const bName = b.item.full_name || b.item.product_code_1 || "";
        return aName.localeCompare(bName, "ko");
      })
      .slice(0, 20)
      .map(({ item }) => {
        const normalizedPath = item.image_path
          ? item.image_path.replace(/^\/+/, "").replace(/^product-samples\//, "")
          : null;

        const image_url = normalizedPath
          ? `${baseUrl}/storage/v1/object/public/product-samples/${normalizedPath}`
          : null;

        return {
          ...item,
          image_url,
        };
      });

    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "server error", items: [] },
      { status: 500 }
    );
  }
}