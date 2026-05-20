import { createClient } from "@supabase/supabase-js";
import { cleanRuntimeEnvValue } from "./image-url";

export function getSupabase() {
  const url = cleanRuntimeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanRuntimeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = cleanRuntimeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
