# MindBloom

A gamified student wellbeing app — habit tracking, journaling, focus timers, and an AI coach, wrapped in light RPG mechanics (XP, streaks, achievements, boss battles).

Plain ES modules, no build step. Works fully offline against `localStorage` with zero configuration; connecting Supabase upgrades it to a real multi-device backend with a leaderboard and friends.

## Local development

```
npx http-server -c-1 .
```

Open the printed URL. Without `js/config.js`, the app runs entirely offline.

## Connecting Supabase (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — creates the `app_data` table, RLS policies, and the `leaderboard()` / `send_cheer()` RPCs.
3. Copy `js/config.example.js` to `js/config.js` (gitignored) and fill in `SUPABASE_URL` / `SUPABASE_ANON_KEY` from Project Settings → API.

## Enabling the AI coach (optional)

AI features (coach, journal analysis, burnout prediction text, weekly reports) call Gemini through a Supabase Edge Function, so the API key never ships to the browser. Everything falls back to deterministic local logic if this isn't set up.

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in:
   ```
   supabase login
   supabase link --project-ref <your-project-ref>   # the id in your Supabase project URL
   ```
3. Set the key as a function secret — it's never written to any file in this repo:
   ```
   supabase secrets set GEMINI_API_KEY=your-key-here
   ```
4. Deploy the proxy function:
   ```
   supabase functions deploy gemini-proxy
   ```
5. In Settings → "Test AI connection" to verify.

Optionally set `GEMINI_MODEL` the same way (defaults to `gemini-flash-latest`).
