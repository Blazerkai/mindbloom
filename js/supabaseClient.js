import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
if (hasSupabase) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
