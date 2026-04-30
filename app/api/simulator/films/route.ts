import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const dynamic = "force-dynamic";

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
  simulation_image_path,
  simulation_thumb_path
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
  simulation_image_path: string | null;
  simulation_thumb_path: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeForSearch(value: string) {
  return value
    .toUpperCase()
    .replace(/번/g, "")
    .replace(/[^0-9A-Z가-힣]/g, "");
}

function buildQueryTokens(query: string) {
  const tokens = new Set<string>();
  const normalized = normalizeForSearch(query);

  if (normalized) tokens.add(normalized);

  const parts = (query.toUpperCase().match(/[A-Z가-힣]+|\d+/g) || [])
    .map((part) => normalizeForSearch(part))
    .filter(Boolean);

  for (const part of parts) tokens.add(part);

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

  if (parts.length > 1) tokens.add(parts.join(""));

  return Array.from(tokens)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
}

function buildDbOrFilter(query: string) {
  const tokens = buildQueryTokens(query);
  const fields = [
    "product_code_1",
    "product_code_2",
    "full_name",
    "color_name",
    "category_main",
    "category_sub",
    "manufacturer",
  ];

  const conditions: string[] = [];

  for (const token of tokens) {
    const safeToken = token.replace(/[%_,()]/g, "").trim();
    if (!safeToken) continue;

    for (const field of fields) {
      conditions.push(`${field}.ilike.%${safeToken}%`);
    }
  }

  return conditions.join(",");
}

function getCleanSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return rawUrl.replace(/\s+/g, "").replace(/\/+$/, "");
}

function toPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;

  const baseUrl = getCleanSupabaseUrl();
  if (!baseUrl) return null;

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath.replace(/\s+/g, "");
  }

  const normalizedPath = imagePath
    .trim()
    .replace(/^\/+/, "")
    .replace(/^product-samples\//, "");

  return `${baseUrl}/storage/v1/object/public/product-samples/${normalizedPath}`;
}

function normalizeFilm(item: ProductRow) {
  const { image_path, simulation_image_path, simulation_thumb_path, ...rest } = item;

  return {
    ...rest,
    image_url: toPublicImageUrl(simulation_image_path || image_path),
    thumb_url: toPublicImageUrl(
      simulation_thumb_path || simulation_image_path || image_path
    ),
  };
}

function getScore(item: ProductRow, query: string) {
  const q = normalizeForSearch(query);
  if (!q) return 1;

  const fields = [
    item.product_code_1,
    item.product_code_2,
    item.full_name,
    item.color_name,
    item.category_main,
    item.category_sub,
    item.manufacturer,
  ]
    .map((value) => normalizeForSearch(value || ""))
    .filter(Boolean);

  let score = 0;

  for (const field of fields) {
    if (field === q) score = Math.max(score, 100);
    else if (field.startsWith(q)) score = Math.max(score, 80);
    else if (field.includes(q)) score = Math.max(score, 60);
  }

  return score;
}

function isExpired(expiresAt: string) {
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
}

async function readAllowedProductIds(
  supabase: any,
  linkId: string
) {
  const { data, error } = await supabase
    .from("simulator_link_films")
    .select("product_id")
    .eq("link_id", linkId);

  if (error) throw error;

  return (data || [])
    .map((row: { product_id?: number | string | null }) => Number(row.product_id))
    .filter((value: number) => Number.isFinite(value));
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다.", items: [] },
      { status: 500 }
    );
  }

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const token = (req.nextUrl.searchParams.get("token") || "").trim();

  if (!token) {
    const auth = await requireSimulatorInstaller();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error, items: [] },
        { status: auth.status }
      );
    }
  }

  try {
    let allowedProductIds: number[] = [];
    let filmScope: "all" | "custom" = "all";
    const hasToken = token.length > 0;

    if (hasToken) {
      const { data: link, error: linkError } = await supabase
        .from("simulator_links")
        .select("id, expires_at, is_active, film_scope")
        .eq("token", token)
        .maybeSingle();

      if (linkError) throw linkError;

      const typedLink = link as {
        id: string;
        expires_at: string;
        is_active: boolean;
        film_scope: string | null;
      } | null;

      if (!typedLink || !typedLink.is_active || isExpired(typedLink.expires_at)) {
        return NextResponse.json(
          { error: "만료된 링크입니다.", items: [] },
          { status: 410 }
        );
      }

      filmScope = typedLink.film_scope === "custom" ? "custom" : "all";

      if (filmScope === "custom") {
        allowedProductIds = await readAllowedProductIds(supabase, typedLink.id);

        if (allowedProductIds.length === 0) {
          return NextResponse.json({ items: [] });
        }
      }
    }

    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("manufacturer", "삼성필름")
      .eq("is_simulatable", true)
      .or("simulation_image_path.not.is.null,image_path.not.is.null")
      .limit(80);

    const orFilter = q ? buildDbOrFilter(q) : "";
    if (orFilter) query = query.or(orFilter);

    if (hasToken && filmScope === "custom") {
      query = query.in("id", allowedProductIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = ((data || []) as ProductRow[])
      .map((item: ProductRow) => ({ item, score: getScore(item, q) }))
      .filter(({ score }: { item: ProductRow; score: number }) => score > 0)
      .sort((a: { item: ProductRow; score: number }, b: { item: ProductRow; score: number }) => {
        if (b.score !== a.score) return b.score - a.score;
        const aName = a.item.full_name || a.item.product_code_1 || "";
        const bName = b.item.full_name || b.item.product_code_1 || "";
        return aName.localeCompare(bName, "ko");
      })
      .slice(0, 60)
      .map(({ item }: { item: ProductRow; score: number }) => normalizeFilm(item));

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "필름 검색 중 오류가 발생했습니다.", items: [] },
      { status: 500 }
    );
  }
}
