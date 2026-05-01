import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FilmScope = "all" | "custom" | "preset";

type LinkRow = {
  id: string;
  token: string;
  installer_name: string | null;
  customer_name: string | null;
  memo: string | null;
  expires_at: string;
  is_active: boolean;
  film_scope: string | null;
  preset_id: string | null;
  created_at: string;
};

type PresetRow = {
  id: string;
  name: string;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const key = serviceKey || anonKey;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSessionName() {
  const raw = cookies().get("session_user")?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}

function createToken() {
  return randomBytes(18).toString("base64url");
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => normalizeString(item))
        .filter((item) => item.length > 0)
    )
  );
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

function normalizeFilmScope(value: unknown): FilmScope {
  if (value === "custom") return "custom";
  if (value === "preset") return "preset";
  return "all";
}

function getExpiresAt(daysValue: unknown) {
  const rawDays = Number(daysValue);
  const safeDays =
    Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 30
      ? Math.floor(rawDays)
      : 7;

  const date = new Date();
  date.setDate(date.getDate() + safeDays);

  return date.toISOString();
}

function isExpired(expiresAt: string) {
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
}

async function readCountMap(
  supabase: any,
  tableName: "simulator_link_spaces" | "simulator_link_films",
  linkIds: string[]
) {
  const map: Record<string, number> = {};

  linkIds.forEach((id) => {
    map[id] = 0;
  });

  if (linkIds.length === 0) return map;

  const { data, error } = await supabase
    .from(tableName)
    .select("link_id")
    .in("link_id", linkIds);

  if (error) throw error;

  (data || []).forEach((row: { link_id?: string | null }) => {
    if (!row.link_id) return;
    map[row.link_id] = (map[row.link_id] || 0) + 1;
  });

  return map;
}

async function readPresetCountMap(supabase: any, presetIds: string[]) {
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

async function readPresetNameMap(supabase: any, presetIds: string[]) {
  const map: Record<string, string> = {};

  if (presetIds.length === 0) return map;

  const { data, error } = await supabase
    .from("simulator_film_presets")
    .select("id, name")
    .in("id", presetIds);

  if (error) throw error;

  ((data || []) as PresetRow[]).forEach((preset) => {
    map[preset.id] = preset.name;
  });

  return map;
}

async function validatePreset(
  supabase: any,
  presetId: string,
  installerName: string
) {
  const { data, error } = await supabase
    .from("simulator_film_presets")
    .select("id, name")
    .eq("id", presetId)
    .eq("installer_name", installerName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;

  return data as PresetRow | null;
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

  const sessionName = auth.name;

  try {
    const { data, error } = await supabase
      .from("simulator_links")
      .select(
        "id, token, installer_name, customer_name, memo, expires_at, is_active, film_scope, preset_id, created_at"
      )
      .eq("installer_name", sessionName)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const links = (data || []) as LinkRow[];
    const linkIds = links.map((link) => link.id);
    const presetIds = Array.from(
      new Set(
        links
          .map((link) => link.preset_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    const [spaceCountMap, filmCountMap, presetCountMap, presetNameMap] = await Promise.all([
      readCountMap(supabase, "simulator_link_spaces", linkIds),
      readCountMap(supabase, "simulator_link_films", linkIds),
      readPresetCountMap(supabase, presetIds),
      readPresetNameMap(supabase, presetIds),
    ]);

    const origin = req.nextUrl.origin;

    const items = links.map((link) => {
      const filmScope = normalizeFilmScope(link.film_scope);
      const presetId = link.preset_id || null;

      return {
        id: link.id,
        token: link.token,
        installer_name: link.installer_name,
        customer_name: link.customer_name,
        memo: link.memo,
        expires_at: link.expires_at,
        created_at: link.created_at,
        is_active: link.is_active,
        is_expired: isExpired(link.expires_at),
        film_scope: filmScope,
        preset_id: presetId,
        preset_name: presetId ? presetNameMap[presetId] || null : null,
        space_count: spaceCountMap[link.id] || 0,
        film_count:
          filmScope === "preset" && presetId
            ? presetCountMap[presetId] || 0
            : filmCountMap[link.id] || 0,
        url: `${origin}/simulator/share/${link.token}`,
        query_url: `${origin}/simulator?token=${encodeURIComponent(link.token)}`,
      };
    });

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
      {
        error:
          error?.message ||
          "시뮬레이션 링크 목록을 불러오지 못했습니다.",
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

  const sessionName = auth.name;

  try {
    const body = await req.json();

    const installerName = sessionName;
    const customerName = normalizeString(body.customer_name);
    const memo = normalizeString(body.memo);
    const expiresAt = getExpiresAt(body.expires_in_days);
    const spaceIds = normalizeStringArray(body.space_ids);
    const filmScope = normalizeFilmScope(body.film_scope);
    const presetId = normalizeString(body.preset_id);
    const productIds = normalizeNumberArray(body.product_ids);

    if (spaceIds.length === 0) {
      return NextResponse.json(
        { error: "고객에게 보여줄 공간을 1개 이상 선택해주세요." },
        { status: 400 }
      );
    }

    if (filmScope === "custom" && productIds.length === 0) {
      return NextResponse.json(
        { error: "필름 제한 사용 시 허용할 필름을 1개 이상 선택해주세요." },
        { status: 400 }
      );
    }

    let preset = null as PresetRow | null;

    if (filmScope === "preset") {
      if (!presetId) {
        return NextResponse.json(
          { error: "사용할 프리셋을 선택해주세요." },
          { status: 400 }
        );
      }

      preset = await validatePreset(supabase, presetId, installerName);

      if (!preset) {
        return NextResponse.json(
          { error: "선택한 프리셋을 찾지 못했습니다." },
          { status: 404 }
        );
      }
    }

    const token = createToken();

    const { data: link, error: linkError } = await supabase
      .from("simulator_links")
      .insert({
        token,
        // installer_id는 기존 DB에서 User.id(uuid)를 참조하는 FK라서 이름 문자열을 넣지 않습니다.
        // 시공자 이름은 installer_name에 저장하고, 링크 관리는 installer_name 기준으로 조회합니다.
        installer_name: installerName,
        customer_name: customerName || null,
        memo: memo || null,
        expires_at: expiresAt,
        is_active: true,
        film_scope: filmScope,
        preset_id: filmScope === "preset" ? presetId : null,
        updated_at: new Date().toISOString(),
      })
      .select("id, token, installer_name, customer_name, expires_at, film_scope, preset_id")
      .single();

    if (linkError) throw linkError;

    const typedLink = link as {
      id: string;
      token: string;
      installer_name: string | null;
      customer_name: string | null;
      expires_at: string;
      film_scope: string;
      preset_id: string | null;
    };

    const spaceRows = spaceIds.map((spaceId) => ({
      link_id: typedLink.id,
      space_id: spaceId,
    }));

    const { error: spaceError } = await supabase
      .from("simulator_link_spaces")
      .insert(spaceRows);

    if (spaceError) throw spaceError;

    if (filmScope === "custom") {
      const filmRows = productIds.map((productId) => ({
        link_id: typedLink.id,
        product_id: productId,
      }));

      const { error: filmError } = await supabase
        .from("simulator_link_films")
        .insert(filmRows);

      if (filmError) throw filmError;
    }

    const origin = req.nextUrl.origin;
    const sharePath = `/simulator/share/${typedLink.token}`;
    const queryPath = `/simulator?token=${encodeURIComponent(typedLink.token)}`;

    return NextResponse.json(
      {
        ok: true,
        link: {
          token: typedLink.token,
          installer_name: typedLink.installer_name,
          customer_name: typedLink.customer_name,
          expires_at: typedLink.expires_at,
          film_scope: typedLink.film_scope,
          preset_id: typedLink.preset_id,
          preset_name: preset?.name || null,
        },
        url: `${origin}${sharePath}`,
        query_url: `${origin}${queryPath}`,
        path: sharePath,
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
        error:
          error?.message ||
          "고객용 시뮬레이션 링크를 생성하지 못했습니다.",
      },
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

  const sessionName = auth.name;

  try {
    let id = req.nextUrl.searchParams.get("id") || "";

    if (!id) {
      const body = await req.json().catch(() => null);
      id = normalizeString(body?.id);
    }

    if (!id) {
      return NextResponse.json(
        { error: "비활성화할 링크 ID가 없습니다." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("simulator_links")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("installer_name", sessionName)
      .select("id, is_active")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: "비활성화할 링크를 찾지 못했습니다." },
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
      {
        error:
          error?.message ||
          "시뮬레이션 링크를 비활성화하지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
