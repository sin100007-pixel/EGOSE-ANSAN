import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PresetRow = {
  id: string;
  installer_name: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

type ProductRow = {
  id: number;
  manufacturer: string | null;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  palette_main: string | null;
  palette_sub: string | null;
  palette_color: string | null;
  image_path: string | null;
  simulation_image_path: string | null;
  simulation_thumb_path: string | null;
};

const PRODUCT_SELECT = `
  id,
  manufacturer,
  product_code_1,
  product_code_2,
  color_name,
  full_name,
  category_main,
  category_sub,
  palette_main,
  palette_sub,
  palette_color,
  image_path,
  simulation_image_path,
  simulation_thumb_path
`;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceKey || anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
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
    sample_url: toPublicImageUrl(image_path),
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
    )
  );
}

async function readItemCountMap(supabase: any, presetIds: string[]) {
  const map: Record<string, number> = {};

  presetIds.forEach((id) => {
    map[id] = 0;
  });

  if (presetIds.length === 0) return map;

  const { data, error } = await supabase
    .from("simulator_film_preset_items")
    .select("preset_id")
    .in("preset_id", presetIds);

  if (error) throw error;

  (data || []).forEach((row: { preset_id?: string | null }) => {
    if (!row.preset_id) return;
    map[row.preset_id] = (map[row.preset_id] || 0) + 1;
  });

  return map;
}

async function readPresetDetail(
  supabase: any,
  presetId: string,
  installerName: string
) {
  const { data: preset, error: presetError } = await supabase
    .from("simulator_film_presets")
    .select("id, installer_name, name, description, is_active, created_at, updated_at")
    .eq("id", presetId)
    .eq("installer_name", installerName)
    .eq("is_active", true)
    .maybeSingle();

  if (presetError) throw presetError;
  if (!preset) return null;

  const typedPreset = preset as PresetRow;

  const { data: itemRows, error: itemError } = await supabase
    .from("simulator_film_preset_items")
    .select("product_id")
    .eq("preset_id", presetId)
    .order("created_at", { ascending: true });

  if (itemError) throw itemError;

  const productIds = (itemRows || [])
    .map((row: { product_id?: number | string | null }) => Number(row.product_id))
    .filter((value: number) => Number.isFinite(value));

  let films: ReturnType<typeof normalizeFilm>[] = [];

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .in("id", productIds);

    if (productsError) throw productsError;

    const orderMap = new Map(productIds.map((id: number, index: number) => [id, index]));

    films = ((products || []) as ProductRow[])
      .map((item) => normalizeFilm(item))
      .sort((a, b) => {
        const ai: number = Number(orderMap.get(Number(a.id)) ?? 99999);
        const bi: number = Number(orderMap.get(Number(b.id)) ?? 99999);
        return ai - bi;
      });
  }

  return {
    ...typedPreset,
    item_count: productIds.length,
    product_ids: productIds,
    films,
  };
}

async function replacePresetItems(
  supabase: any,
  presetId: string,
  productIds: number[]
) {
  const { error: deleteError } = await supabase
    .from("simulator_film_preset_items")
    .delete()
    .eq("preset_id", presetId);

  if (deleteError) throw deleteError;

  if (productIds.length === 0) return;

  const rows = productIds.map((productId) => ({
    preset_id: presetId,
    product_id: productId,
  }));

  const { error: insertError } = await supabase
    .from("simulator_film_preset_items")
    .insert(rows);

  if (insertError) throw insertError;
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다.", items: [] },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, items: [] },
      { status: auth.status }
    );
  }

  const presetId = normalizeString(req.nextUrl.searchParams.get("id"));

  try {
    if (presetId) {
      const detail = await readPresetDetail(supabase, presetId, auth.name);

      if (!detail) {
        return NextResponse.json(
          { error: "프리셋을 찾지 못했습니다." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { item: detail },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const { data, error } = await supabase
      .from("simulator_film_presets")
      .select("id, installer_name, name, description, is_active, created_at, updated_at")
      .eq("installer_name", auth.name)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const presets = (data || []) as PresetRow[];
    const countMap = await readItemCountMap(
      supabase,
      presets.map((preset) => preset.id)
    );

    return NextResponse.json(
      {
        items: presets.map((preset) => ({
          ...preset,
          item_count: countMap[preset.id] || 0,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "프리셋을 불러오지 못했습니다.",
        items: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다." },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await req.json();
    const name = normalizeString(body.name);
    const description = normalizeString(body.description);
    const productIds = normalizeNumberArray(body.product_ids);

    if (!name) {
      return NextResponse.json(
        { error: "프리셋 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "프리셋에 담을 필름을 1개 이상 선택해주세요." },
        { status: 400 }
      );
    }

    const { data: preset, error: presetError } = await supabase
      .from("simulator_film_presets")
      .insert({
        installer_name: auth.name,
        name,
        description: description || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id, installer_name, name, description, is_active, created_at, updated_at")
      .single();

    if (presetError) throw presetError;

    const typedPreset = preset as PresetRow;
    await replacePresetItems(supabase, typedPreset.id, productIds);

    return NextResponse.json(
      {
        ok: true,
        item: {
          ...typedPreset,
          item_count: productIds.length,
          product_ids: productIds,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "프리셋을 만들지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다." },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const body = await req.json();
    const id = normalizeString(body.id);
    const name = normalizeString(body.name);
    const description = normalizeString(body.description);
    const productIds = normalizeNumberArray(body.product_ids);

    if (!id) {
      return NextResponse.json(
        { error: "수정할 프리셋 ID가 없습니다." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "프리셋 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    if (productIds.length === 0) {
      return NextResponse.json(
        { error: "프리셋에 담을 필름을 1개 이상 선택해주세요." },
        { status: 400 }
      );
    }

    const { data: preset, error: presetError } = await supabase
      .from("simulator_film_presets")
      .update({
        name,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("installer_name", auth.name)
      .eq("is_active", true)
      .select("id, installer_name, name, description, is_active, created_at, updated_at")
      .maybeSingle();

    if (presetError) throw presetError;

    if (!preset) {
      return NextResponse.json(
        { error: "수정할 프리셋을 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const typedPreset = preset as PresetRow;
    await replacePresetItems(supabase, typedPreset.id, productIds);

    return NextResponse.json(
      {
        ok: true,
        item: {
          ...typedPreset,
          item_count: productIds.length,
          product_ids: productIds,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "프리셋을 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다." },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    let id = normalizeString(req.nextUrl.searchParams.get("id"));

    if (!id) {
      const body = await req.json().catch(() => null);
      id = normalizeString(body?.id);
    }

    if (!id) {
      return NextResponse.json(
        { error: "삭제할 프리셋 ID가 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("simulator_film_presets")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("installer_name", auth.name)
      .select("id, is_active")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "삭제할 프리셋을 찾지 못했습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true, id, is_active: false },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "프리셋을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
