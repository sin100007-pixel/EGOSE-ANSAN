import { NextRequest } from "next/server";
import type { ProductRow } from "./film-normalizer";

export function cleanParam(value: string | null) {
  return (value || "").trim();
}

export function cleanPaletteColorParams(req: NextRequest) {
  return Array.from(
    new Set(
      req.nextUrl.searchParams
        .getAll("palette_color")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function normalizeForSearch(value: string) {
  return value
    .toUpperCase()
    .replace(/번/g, "")
    .replace(/[^0-9A-Z가-힣]/g, "");
}

export function buildQueryTokens(query: string) {
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

export function buildDbOrFilter(query: string) {
  const tokens = buildQueryTokens(query);
  const fields = [
    "product_code_1",
    "product_code_2",
    "full_name",
    "color_name",
    "category_main",
    "category_sub",
    "palette_main",
    "palette_sub",
    "palette_color",
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

export function getScore(item: ProductRow, query: string) {
  const q = normalizeForSearch(query);
  if (!q) return 1;

  const code1 = normalizeForSearch(item.product_code_1 || "");
  const code2 = normalizeForSearch(item.product_code_2 || "");
  const fullName = normalizeForSearch(item.full_name || "");
  const colorName = normalizeForSearch(item.color_name || "");

  const fields = [
    item.product_code_1,
    item.product_code_2,
    item.full_name,
    item.color_name,
    item.category_main,
    item.category_sub,
    item.palette_main,
    item.palette_sub,
    item.palette_color,
    item.manufacturer,
    code1 && code2 ? `${code1}${code2}` : "",
    code1 && colorName ? `${code1}${colorName}` : "",
    code2 && colorName ? `${code2}${colorName}` : "",
    fullName,
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
