import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_MB = 7;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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

function getExtensionFromValues(fileName: string, fileType: string) {
  const nameExtension = fileName.split(".").pop()?.toLowerCase() || "";

  if (["jpg", "jpeg", "png", "webp"].includes(nameExtension)) {
    return nameExtension === "jpeg" ? "jpg" : nameExtension;
  }

  if (fileType === "image/jpeg") return "jpg";
  if (fileType === "image/png") return "png";
  if (fileType === "image/webp") return "webp";

  return "jpg";
}

function getExtension(file: File) {
  return getExtensionFromValues(file.name, file.type);
}

function getInstallerFolder(name: string) {
  const encoded = Buffer.from(name || "installer").toString("base64url").slice(0, 60);
  return `installer-${encoded || "unknown"}`;
}

function isAllowedImageType(fileType: string): fileType is (typeof ALLOWED_IMAGE_TYPES)[number] {
  return ALLOWED_IMAGE_TYPES.includes(fileType as (typeof ALLOWED_IMAGE_TYPES)[number]);
}

function getUploadBucket(type: string) {
  return type === "logo" ? "contractor-logos" : "contractor-portfolios";
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

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let body: {
      fileName?: unknown;
      fileType?: unknown;
      fileSize?: unknown;
      type?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "업로드 요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const fileName = String(body.fileName || "image");
    const fileType = String(body.fileType || "");
    const fileSize = Number(body.fileSize || 0);
    const rawType = String(body.type || "portfolio");

    if (!fileType.startsWith("image/")) {
      return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
    }

    if (!isAllowedImageType(fileType)) {
      return NextResponse.json(
        { error: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "이미지 파일 크기를 확인하지 못했습니다." }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `이미지 용량은 ${MAX_FILE_SIZE_MB}MB 이하만 업로드할 수 있습니다.` },
        { status: 400 }
      );
    }

    const bucket = getUploadBucket(rawType);
    const folder = getInstallerFolder(auth.name);
    const extension = getExtensionFromValues(fileName, fileType);
    const filePath = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (signedError) {
      console.error("[simulator/contractor-upload] signed upload url error:", signedError);
      return NextResponse.json(
        { error: "업로드 주소를 만들지 못했습니다. Storage 정책 또는 bucket 설정을 확인해주세요." },
        { status: 500 }
      );
    }

    const signedUpload = signedData as { path?: string; token?: string } | null;

    if (!signedUpload?.path || !signedUpload?.token) {
      return NextResponse.json(
        { error: "업로드 주소를 만들지 못했습니다." },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      bucket,
      path: filePath,
      url: publicData.publicUrl,
      signedUpload: {
        path: signedUpload.path,
        token: signedUpload.token,
      },
    });
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

  if (!isAllowedImageType(rawFile.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." },
      { status: 400 }
    );
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `이미지 용량은 ${MAX_FILE_SIZE_MB}MB 이하만 업로드할 수 있습니다.` },
      { status: 400 }
    );
  }

  const bucket = getUploadBucket(rawType);
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
