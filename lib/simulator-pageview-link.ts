import { createClient } from "@supabase/supabase-js";

export type SimulatorPageViewLinkInfo = {
  token: string;
  installerName: string | null;
  customerName: string | null;
  memo: string | null;
};

type SimulatorLinkRow = {
  token: string | null;
  installer_name: string | null;
  customer_name: string | null;
  memo: string | null;
};

function cleanRuntimeEnvValue(value?: string | null) {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

function normalizeToken(value: string | null | undefined): string | null {
  const token = (value || "").trim();
  if (!token) return null;

  try {
    const decoded = decodeURIComponent(token).trim();
    if (/^[A-Za-z0-9_-]{6,200}$/.test(decoded)) return decoded;
  } catch {
    // 아래 fallback에서 원본 token을 다시 검사합니다.
  }

  if (/^[A-Za-z0-9_-]{6,200}$/.test(token)) return token;

  return null;
}

export function extractSimulatorLinkToken(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  try {
    const url = raw.startsWith("/")
      ? new URL(raw, "https://egose.local")
      : new URL(raw);

    const pathToken = url.pathname.match(/^\/simulator\/share\/([^/?#]+)/)?.[1];
    const queryToken = url.searchParams.get("token");

    return normalizeToken(pathToken) || normalizeToken(queryToken);
  } catch {
    const pathToken = raw.match(/\/simulator\/share\/([^/?#]+)/)?.[1];
    const queryToken = raw.match(/[?&]token=([^&#]+)/)?.[1];

    return normalizeToken(pathToken) || normalizeToken(queryToken);
  }
}

function createSupabaseClient() {
  const url = cleanRuntimeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanRuntimeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = cleanRuntimeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const key = serviceKey || anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function toLinkInfo(row: SimulatorLinkRow): SimulatorPageViewLinkInfo | null {
  const token = normalizeToken(row.token);
  if (!token) return null;

  return {
    token,
    installerName: row.installer_name || null,
    customerName: row.customer_name || null,
    memo: row.memo || null,
  };
}

export async function readSimulatorLinkInfoMap(tokens: string[]) {
  const normalizedTokens = Array.from(
    new Set(
      tokens
        .map((token) => normalizeToken(token))
        .filter((token): token is string => Boolean(token))
    )
  );

  const emptyMap: Record<string, SimulatorPageViewLinkInfo> = {};
  if (normalizedTokens.length === 0) return emptyMap;

  const supabase = createSupabaseClient();
  if (!supabase) return emptyMap;

  try {
    const { data, error } = await supabase
      .from("simulator_links")
      .select("token, installer_name, customer_name, memo")
      .in("token", normalizedTokens);

    if (error) throw error;

    return ((data || []) as SimulatorLinkRow[]).reduce(
      (map, row) => {
        const info = toLinkInfo(row);
        if (info) map[info.token] = info;
        return map;
      },
      {} as Record<string, SimulatorPageViewLinkInfo>
    );
  } catch (error) {
    console.error("simulator link lookup for pageview failed", error);
    return emptyMap;
  }
}

export async function readSimulatorLinkInfoByToken(token: string | null) {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) return null;

  const map = await readSimulatorLinkInfoMap([normalizedToken]);
  return map[normalizedToken] || null;
}
