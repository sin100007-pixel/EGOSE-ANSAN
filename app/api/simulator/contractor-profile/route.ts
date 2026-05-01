import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContractorPhotoPayload = {
  image_url?: unknown;
  title?: unknown;
  description?: unknown;
  sort_order?: unknown;
  is_representative?: unknown;
  is_visible?: unknown;
};

type ContractorProfilePayload = {
  display_name?: unknown;
  logo_url?: unknown;
  greeting?: unknown;
  phone?: unknown;
  kakao_url?: unknown;
  brand_color?: unknown;
  is_active?: unknown;
  photos?: unknown;
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

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalText(value: unknown) {
  const text = cleanText(value);
  return text.length > 0 ? text : null;
}

function cleanBrandColor(value: unknown) {
  const text = cleanText(value);
  if (/^#[0-9A-Fa-f]{6}$/.test(text)) return text;
  return "#11104a";
}

function normalizePhotos(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 12)
    .map((item, index) => {
      const photo = (item || {}) as ContractorPhotoPayload;
      const imageUrl = cleanText(photo.image_url);

      if (!imageUrl) return null;

      const rawSort = Number(photo.sort_order);
      const sortOrder = Number.isFinite(rawSort) ? Math.floor(rawSort) : index + 1;

      return {
        image_url: imageUrl,
        title: cleanOptionalText(photo.title),
        description: cleanOptionalText(photo.description),
        sort_order: sortOrder,
        is_representative: Boolean(photo.is_representative),
        is_visible: photo.is_visible === false ? false : true,
      };
    })
    .filter(Boolean) as Array<{
    image_url: string;
    title: string | null;
    description: string | null;
    sort_order: number;
    is_representative: boolean;
    is_visible: boolean;
  }>;
}

async function readProfile(supabase: any, installerName: string) {
  const { data: profile, error: profileError } = await supabase
    .from("contractor_profiles")
    .select(
      "id, installer_name, display_name, logo_url, greeting, phone, kakao_url, brand_color, is_active, created_at, updated_at"
    )
    .eq("installer_name", installerName)
    .maybeSingle();

  if (profileError) throw profileError;

  let photos: any[] = [];

  if (profile?.id) {
    const { data: photoRows, error: photosError } = await supabase
      .from("contractor_portfolio_photos")
      .select(
        "id, contractor_profile_id, image_url, title, description, sort_order, is_representative, is_visible, created_at"
      )
      .eq("contractor_profile_id", profile.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (photosError) throw photosError;
    photos = photoRows || [];
  }

  return {
    profile: profile || null,
    photos,
  };
}

export async function GET() {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다.", profile: null, photos: [] },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, profile: null, photos: [] },
      { status: auth.status }
    );
  }

  try {
    const result = await readProfile(supabase, auth.name);

    return NextResponse.json({
      ...result,
      installer_name: auth.name,
    });
  } catch (error) {
    console.error("[simulator/contractor-profile] GET error:", error);
    return NextResponse.json(
      { error: "시공자 설정을 불러오지 못했습니다.", profile: null, photos: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없습니다.", profile: null, photos: [] },
      { status: 500 }
    );
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, profile: null, photos: [] },
      { status: auth.status }
    );
  }

  let body: ContractorProfilePayload = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다.", profile: null, photos: [] },
      { status: 400 }
    );
  }

  const displayName = cleanText(body.display_name) || auth.name;
  const photos = normalizePhotos(body.photos);

  const profileRow = {
    installer_name: auth.name,
    display_name: displayName,
    logo_url: cleanOptionalText(body.logo_url),
    greeting: cleanOptionalText(body.greeting),
    phone: cleanOptionalText(body.phone),
    kakao_url: cleanOptionalText(body.kakao_url),
    brand_color: cleanBrandColor(body.brand_color),
    is_active: body.is_active === false ? false : true,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: profile, error: upsertError } = await supabase
      .from("contractor_profiles")
      .upsert(profileRow, { onConflict: "installer_name" })
      .select(
        "id, installer_name, display_name, logo_url, greeting, phone, kakao_url, brand_color, is_active, created_at, updated_at"
      )
      .single();

    if (upsertError) throw upsertError;

    const { error: deleteError } = await supabase
      .from("contractor_portfolio_photos")
      .delete()
      .eq("contractor_profile_id", profile.id);

    if (deleteError) throw deleteError;

    if (photos.length > 0) {
      const rows = photos.map((photo) => ({
        ...photo,
        contractor_profile_id: profile.id,
      }));

      const { error: insertError } = await supabase
        .from("contractor_portfolio_photos")
        .insert(rows);

      if (insertError) throw insertError;
    }

    const result = await readProfile(supabase, auth.name);

    return NextResponse.json({
      ...result,
      installer_name: auth.name,
      message: "시공자 설정을 저장했습니다.",
    });
  } catch (error) {
    console.error("[simulator/contractor-profile] POST error:", error);
    return NextResponse.json(
      { error: "시공자 설정을 저장하지 못했습니다.", profile: null, photos: [] },
      { status: 500 }
    );
  }
}
