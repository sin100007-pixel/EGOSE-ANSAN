export function cleanRuntimeEnvValue(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\\[nr]/g, "")
    .replace(/[\r\n\t ]+/g, "");
}

export function getCleanSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return cleanRuntimeEnvValue(rawUrl).replace(/\/+$/, "");
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

  const cleaned = String(imagePath)
    .trim()
    .replace(/\\[nr]/g, "")
    .replace(/[\r\n\t ]+/g, "");

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
