import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentEgoseUser } from "@/lib/server-auth";

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

const SAMSUNG_SLG_RECOMMENDED_NUMBERS = [
  "001",
  "002",
  "003",
  "004",
  "005",
  "006",
  "007",
  "008",
  "045",
  "046",
  "047",
] as const;


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

function isNumericOnlyQuery(query: string) {
  return /^\d+$/.test(normalizeForSearch(query));
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

function hasExactCodeMatch(item: ProductRow, query: string) {
  const queryNorm = normalizeForSearch(query);
  if (!queryNorm) return false;

  const codeTokens = [
    ...buildCodeTokens(item.product_code_1),
    ...buildCodeTokens(item.product_code_2),
  ];

  return Array.from(new Set(codeTokens)).some((token) => token === queryNorm);
}

function getManufacturerPriority(manufacturer: string | null | undefined) {
  const value = (manufacturer || "").toUpperCase();

  if (value.includes("삼성") || value.includes("SAMSUNG")) return 0;
  if (value.includes("영림") || value.includes("YOUNGLIM")) return 1;
  if (value.includes("예림") || value.includes("YERIM")) return 2;

  return 9;
}

function getPreferredBrandBonus(manufacturer: string | null | undefined) {
  const priority = getManufacturerPriority(manufacturer);

  if (priority === 0) return 3; // 삼성
  if (priority === 1) return 2; // 영림
  if (priority === 2) return 1; // 예림

  return 0;
}

function getFieldMatchLevel(item: ProductRow, query: string) {
  const queryNorm = normalizeForSearch(query);
  if (!queryNorm) return 0;

  const fields = [
    normalizeForSearch(item.color_name || ""),
    normalizeForSearch(item.full_name || ""),
    normalizeForSearch(item.category_main || ""),
    normalizeForSearch(item.category_sub || ""),
  ].filter(Boolean);

  let level = 0;

  for (const field of fields) {
    if (field === queryNorm) level = Math.max(level, 3);
    else if (field.startsWith(queryNorm)) level = Math.max(level, 2);
    else if (field.includes(queryNorm)) level = Math.max(level, 1);
  }

  return level;
}

function getPreferredBrandBoost(item: ProductRow, query: string) {
  const brandBonus = getPreferredBrandBonus(item.manufacturer);
  if (!brandBonus) return 0;

  const exactCodeMatch = hasExactCodeMatch(item, query);
  const fieldMatchLevel = getFieldMatchLevel(item, query);

  // 숫자 코드 exact match는 가장 강하게 우대
  if (isNumericOnlyQuery(query) && exactCodeMatch) {
    if (brandBonus === 3) return 15; // 삼성
    if (brandBonus === 2) return 14; // 영림
    if (brandBonus === 1) return 13; // 예림
  }

  // 색상명 / full_name / 카테고리 검색 우대
  if (fieldMatchLevel === 3) {
    if (brandBonus === 3) return 9;
    if (brandBonus === 2) return 8;
    if (brandBonus === 1) return 7;
  }

  if (fieldMatchLevel === 2) {
    if (brandBonus === 3) return 7;
    if (brandBonus === 2) return 6;
    if (brandBonus === 1) return 5;
  }

  if (fieldMatchLevel === 1) {
    if (brandBonus === 3) return 5;
    if (brandBonus === 2) return 4;
    if (brandBonus === 1) return 3;
  }

  // 그 외에는 아주 약하게만 브랜드 우선
  return brandBonus;
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

  score += getPreferredBrandBoost(item, query);

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

function getImageUrl(baseUrl: string, imagePath: string | null | undefined) {
  const normalizedPath = imagePath
    ? imagePath.replace(/^\/+/, "").replace(/^product-samples\//, "")
    : null;

  return normalizedPath
    ? `${baseUrl}/storage/v1/object/public/product-samples/${normalizedPath}`
    : null;
}

function getSamsungSlgRecommendationOrder(item: ProductRow) {
  const text = `${item.product_code_1 || ""} ${item.product_code_2 || ""} ${
    item.full_name || ""
  }`.toUpperCase();

  const match = text.match(/SL[GF][^0-9]*(\d{3})/);
  const number = match?.[1] || "";
  const index = SAMSUNG_SLG_RECOMMENDED_NUMBERS.indexOf(
    number as (typeof SAMSUNG_SLG_RECOMMENDED_NUMBERS)[number]
  );

  return index === -1 ? 999 : index;
}

async function getSamsungSlgRecommendedItems(memberType: MemberType) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const orFilter = SAMSUNG_SLG_RECOMMENDED_NUMBERS.flatMap((number) => [
    `product_code_1.ilike.%SLG%${number}%`,
    `product_code_1.ilike.%SLF%${number}%`,
    `product_code_2.ilike.%SLG%${number}%`,
    `product_code_2.ilike.%SLF%${number}%`,
    `full_name.ilike.%SLG%${number}%`,
    `full_name.ilike.%SLF%${number}%`,
    `and(product_code_1.ilike.%SLG%,product_code_2.ilike.%${number}%)`,
    `and(product_code_1.ilike.%SLF%,product_code_2.ilike.%${number}%)`,
  ]).join(",");

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("manufacturer", "삼성필름")
    .or(orFilter)
    .limit(30);

  if (error) {
    throw error;
  }

  const uniqueById = new Map<number, ProductRow>();

  for (const item of (data || []) as ProductRow[]) {
    uniqueById.set(item.id, item);
  }

  return Array.from(uniqueById.values())
    .sort((a, b) => {
      const orderDiff =
        getSamsungSlgRecommendationOrder(a) - getSamsungSlgRecommendationOrder(b);

      if (orderDiff !== 0) return orderDiff;

      const aName = a.full_name || a.product_code_1 || "";
      const bName = b.full_name || b.product_code_1 || "";
      return aName.localeCompare(bName, "ko");
    })
    .slice(0, SAMSUNG_SLG_RECOMMENDED_NUMBERS.length)
    .map((item) => ({
      ...applyVisiblePrices(item, memberType),
      image_url: getImageUrl(baseUrl, item.image_path),
    }));
}

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const recommended = (req.nextUrl.searchParams.get("recommended") || "").trim();

    if (!q && recommended !== "samsung-slg") {
      return NextResponse.json({ items: [] });
    }

    const user = await getCurrentEgoseUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", items: [] },
        { status: 401 }
      );
    }

    const memberType = normalizeMemberType(user.memberType);

    if (recommended === "samsung-slg") {
      const items = await getSamsungSlgRecommendedItems(memberType);
      return NextResponse.json({ items });
    }

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
        exactCodeMatch: hasExactCodeMatch(item as ProductRow, q),
        fieldMatchLevel: getFieldMatchLevel(item as ProductRow, q),
        manufacturerPriority: getManufacturerPriority(
          (item as ProductRow).manufacturer
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;

        if (a.exactCodeMatch !== b.exactCodeMatch) {
          return a.exactCodeMatch ? -1 : 1;
        }

        if (b.fieldMatchLevel !== a.fieldMatchLevel) {
          return b.fieldMatchLevel - a.fieldMatchLevel;
        }

        if (a.manufacturerPriority !== b.manufacturerPriority) {
          return a.manufacturerPriority - b.manufacturerPriority;
        }

        const aName = a.item.full_name || a.item.product_code_1 || "";
        const bName = b.item.full_name || b.item.product_code_1 || "";
        return aName.localeCompare(bName, "ko");
      })
      .slice(0, 20)
      .map(({ item }) => {
        return {
          ...item,
          image_url: getImageUrl(baseUrl, item.image_path),
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