export function getCleanSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return rawUrl.replace(/\s+/g, "").replace(/\/+$/, "");
}

export function encodeStoragePath(pathValue: string) {
  return pathValue
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function toPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;

  const baseUrl = getCleanSupabaseUrl();
  if (!baseUrl) return null;

  const cleaned = String(imagePath).trim().replace(/\s+/g, "");

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const url = new URL(cleaned);
      url.pathname = url.pathname
        .split("/")
        .map((part) => (part ? encodeURIComponent(decodeURIComponent(part)) : part))
        .join("/");
      return url.toString();
    } catch {
      return encodeURI(cleaned);
    }
  }

  const normalizedPath = cleaned
    .replace(/^\/+/, "")
    .replace(/^product-samples\//, "");

  return `${baseUrl}/storage/v1/object/public/product-samples/${encodeStoragePath(normalizedPath)}`;
}
