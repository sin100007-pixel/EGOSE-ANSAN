import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const ACCESS_COOKIE_NAME = "egose_session";

const SIMULATOR_ACCESS_CACHE_MS = 30 * 1000;

let simulatorAuthSupabase: any | null | undefined;
const simulatorAccessCache = new Map<
  string,
  {
    allowed: boolean;
    expiresAt: number;
  }
>();
const simulatorAccessPending = new Map<string, Promise<boolean>>();

function getSupabaseForSimulatorAuth() {
  if (simulatorAuthSupabase !== undefined) {
    return simulatorAuthSupabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceKey || anonKey;

  if (!url || !key) {
    simulatorAuthSupabase = null;
    return null;
  }

  simulatorAuthSupabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return simulatorAuthSupabase;
}

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export function getSimulatorSessionName() {
  const raw = cookies().get("session_user")?.value || "";
  return raw ? safeDecodeCookieValue(raw) : "";
}

async function getSecureSessionName() {
  const accessToken = cookies().get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return "";
  }

  try {
    // 기존에는 getCurrentEgoseUser()를 통해 Prisma로 User 테이블을 다시 조회했습니다.
    // 시뮬봇 관리 화면은 이름만 필요하므로 JWT 쿠키만 검증해서 페이지 전환 시 DB 왕복을 줄입니다.
    const { verifyAccessToken } = await import("@/lib/auth-tokens");
    const session = await verifyAccessToken(accessToken);
    return session?.name?.trim() || "";
  } catch (error) {
    console.error("[simulator/auth] secure session check failed:", error);
    return "";
  }
}

async function getSimulatorAuthName() {
  const secureName = await getSecureSessionName();

  if (secureName) {
    return secureName;
  }

  return getSimulatorSessionName();
}

async function readSimulatorAccessFromSupabase(userName: string) {
  const supabase = getSupabaseForSimulatorAuth();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("User")
    .select("simulator_access")
    .eq("name", userName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.simulator_access === "y";
}

export async function isSimulatorAllowedUser(name: string) {
  const userName = name.trim();

  if (!userName) {
    return false;
  }

  const now = Date.now();
  const cached = simulatorAccessCache.get(userName);

  if (cached && cached.expiresAt > now) {
    return cached.allowed;
  }

  const pending = simulatorAccessPending.get(userName);

  if (pending) {
    return pending;
  }

  const request = readSimulatorAccessFromSupabase(userName)
    .then((allowed) => {
      simulatorAccessCache.set(userName, {
        allowed,
        expiresAt: Date.now() + SIMULATOR_ACCESS_CACHE_MS,
      });
      return allowed;
    })
    .catch((error) => {
      console.error("[simulator/auth] allowed user check failed:", error);
      simulatorAccessCache.delete(userName);
      return false;
    })
    .finally(() => {
      simulatorAccessPending.delete(userName);
    });

  simulatorAccessPending.set(userName, request);

  return request;
}

export async function requireSimulatorInstaller() {
  const name = await getSimulatorAuthName();

  if (!name) {
    return {
      ok: false as const,
      status: 401,
      name: "",
      error: "로그인이 필요합니다.",
    };
  }

  const allowed = await isSimulatorAllowedUser(name);

  if (!allowed) {
    return {
      ok: false as const,
      status: 403,
      name,
      error: "필름시뮬레이터 사용 권한이 없습니다.",
    };
  }

  return {
    ok: true as const,
    status: 200,
    name,
    error: "",
  };
}
