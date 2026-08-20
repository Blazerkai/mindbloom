// Server-side proxy for Gemini calls. Keeps GEMINI_API_KEY out of the client
// bundle entirely — it's only ever read here, from a Supabase secret.
//
// Deploy: supabase functions deploy gemini-proxy
// Set the secret once: supabase secrets set GEMINI_API_KEY=your-key-here
//
// Requires a valid Supabase JWT (the app's anon key already provides this via
// supabase.functions.invoke), matching the auth model the rest of the app uses.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// "gemini-flash-latest" currently resolves to a model with a very small
// (20 requests/day) free-tier quota. gemini-3.1-flash-lite has a much more
// generous free tier and is fast enough for these short conversational calls.
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY secret is not set on this function." }, 500);
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return jsonResponse({ error: "Missing 'prompt' string in request body." }, 400);
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const json = await res.json();
    if (!res.ok) {
      return jsonResponse({ error: `Gemini HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}` }, 502);
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return jsonResponse(
        { error: `No text in Gemini response (finishReason: ${json.candidates?.[0]?.finishReason || "unknown"})` },
        502
      );
    }

    return jsonResponse({ text });
  } catch (e) {
    return jsonResponse({ error: e.message || "Unknown server error." }, 500);
  }
});
