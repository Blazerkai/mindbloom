// Copy this file to config.js and fill in real values, then commit it — the
// Supabase anon key is meant to be public (see the note in config.js).
// Without Supabase config, the app runs fully offline against localStorage.

export const SUPABASE_URL = ""; // e.g. "https://xxxxx.supabase.co"
export const SUPABASE_ANON_KEY = ""; // the "anon" / "public" key from Project Settings > API

// The Gemini key is NOT configured here — it lives only as a Supabase Edge
// Function secret (supabase/functions/gemini-proxy), so it never ships to
// the browser. Deploy the function and run:
//   supabase secrets set GEMINI_API_KEY=your-key-here
// See README.md for the full setup steps.
