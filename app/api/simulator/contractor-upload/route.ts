import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

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

function getExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";

  if (["jpg", "jpeg", "png", "webp"].includes(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function getInstallerFolder(name: string) {
  const encoded = Buffer.from(name || "installer").toString("base64url").slice(0, 60);
  return `installer-${encoded || "unknown"}`;
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase 환경변수가 없습니다." }, { status: 500 });
  }

  const auth = await requireSimulatorInstaller();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "업로드 요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const rawFile = formData.get("file");
  const rawType = String(formData.get("type") || "portfolio");

  if (!(rawFile instanceof File)) {
    return NextResponse.json({ error: "업로드할 이미지 파일이 없습니다." }, { status: 400 });
  }

  if (!rawFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(rawFile.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "이미지 용량은 8MB 이하만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  const bucket = rawType === "logo" ? "contractor-logos" : "contractor-portfolios";
  const folder = getInstallerFolder(auth.name);
  const extension = getExtension(rawFile);
  const filePath = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;

  try {
    const buffer = Buffer.from(await rawFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: rawFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[simulator/contractor-upload] upload error:", uploadError);
      return NextResponse.json(
        { error: "이미지를 업로드하지 못했습니다. Storage 정책 또는 bucket 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      bucket,
      path: filePath,
      url: data.publicUrl,
    });
  } catch (error) {
    console.error("[simulator/contractor-upload] POST error:", error);
    return NextResponse.json({ error: "이미지를 업로드하지 못했습니다." }, { status: 500 });
  }
}
