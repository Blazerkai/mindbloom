import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "./vendor/supabase/supabase.esm.js";

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;
if (hasSupabase) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
