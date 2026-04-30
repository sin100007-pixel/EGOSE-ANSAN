import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getSupabaseForSimulatorAuth() {
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

export function getSimulatorSessionName() {
  const raw = cookies().get("session_user")?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}

export async function isSimulatorAllowedUser(name: string) {
  const userName = name.trim();

  if (!userName) {
    return false;
  }

  const supabase = getSupabaseForSimulatorAuth();

  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("User")
      .select("simulator_access")
      .eq("name", userName)
      .maybeSingle();

    if (error) {
      console.error("[simulator/auth] allowed user check error:", error);
      return false;
    }

    return data?.simulator_access === "y";
  } catch (error) {
    console.error("[simulator/auth] allowed user check failed:", error);
    return false;
  }
}

export async function requireSimulatorInstaller() {
  const name = getSimulatorSessionName();

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
