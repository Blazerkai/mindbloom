// Committed on purpose: the Supabase anon key is safe to ship client-side —
// it's designed to be public, with access controlled by Row Level Security
// policies (see supabase/schema.sql), not by keeping this key secret. This is
// what lets GitHub Pages (a static host with no server-side config step) work.

export const SUPABASE_URL = "https://xprowlfizdlgnauujcvy.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwcm93bGZpemRsZ25hdXVqY3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzI3MjksImV4cCI6MjEwMTE0ODcyOX0.Jm6kv3DSLPI7KqI04fSZKdLEuH1d7m6Rlu6O2989AEY";

// The Gemini key is NOT configured here — it lives only as a Supabase Edge
// Function secret (supabase/functions/gemini-proxy), so it never ships to
// the browser. See README.md for deployment steps.
