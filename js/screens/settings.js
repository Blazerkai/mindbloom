import { authService } from "../authService.js";
import { profileRepo } from "../repositories.js";
import { hasSupabase } from "../supabaseClient.js";
import { store } from "../store.js";
import { testGeminiConnection } from "../ai.js";

const ALL_COLLECTIONS = [
  "profiles", "players", "water", "sleep", "mood", "journal", "gratitude",
  "mindfulnessSessions", "focusSessions", "quests", "goals", "studyTasks",
  "achievements", "bossState", "trustedContacts", "friends", "notifications",
  "coachChat", "reports", "xpLog",
];

export async function render(container, onSignOut) {
  const profile = await profileRepo.get();
  container.innerHTML = `
    <div class="screen-title"><h2>Settings</h2></div>
    <div class="glass-card section">
      <h3>Profile</h3>
      <input id="s-name" placeholder="Name" value="${profile?.name || ""}" aria-label="Name" />
      <input id="s-school" placeholder="School" value="${profile?.school || ""}" aria-label="School" />
      <input id="s-grade" placeholder="Grade" value="${profile?.grade || ""}" aria-label="Grade" />
      <button id="s-save" class="gradient-btn">Save</button>
    </div>
    <div class="glass-card section">
      <h3>Backend status</h3>
      <p>${hasSupabase ? '<span class="pill good">Supabase connected — all data (streaks, coins, levels, quests, everything) is stored in your Postgres database</span>' : '<span class="pill warn">Running on local storage — add Supabase credentials in js/config.js</span>'}</p>
      <div class="flex-between">
        <p style="margin:0;">${hasSupabase ? '<span class="pill good">AI proxy available (Supabase Edge Function)</span>' : '<span class="pill warn">AI coach running on offline fallback — connect Supabase to enable live AI</span>'}</p>
        ${hasSupabase ? `<button id="s-test-ai" class="ghost-btn small-btn">Test AI connection</button>` : ""}
      </div>
      <p id="s-ai-result" class="muted" style="margin-top:0.4rem;"></p>
    </div>
    <div class="glass-card section">
      <h3>Data</h3>
      <button id="s-export" class="ghost-btn">Export my data (JSON)</button>
    </div>
    <div class="glass-card section">
      <h3>Account</h3>
      <button id="s-signout" class="ghost-btn">Sign out</button>
    </div>
  `;

  container.querySelector("#s-save").addEventListener("click", async () => {
    await profileRepo.save({
      name: container.querySelector("#s-name").value.trim(),
      school: container.querySelector("#s-school").value.trim(),
      grade: container.querySelector("#s-grade").value.trim(),
    });
    alert("Saved.");
  });

  container.querySelector("#s-test-ai")?.addEventListener("click", async () => {
    const out = container.querySelector("#s-ai-result");
    out.textContent = "Testing…";
    const result = await testGeminiConnection();
    out.innerHTML = result.ok
      ? `<span class="pill good">Live — Gemini replied: "${result.message}"</span>`
      : `<span class="pill danger">Failed — ${result.message}</span>`;
  });

  container.querySelector("#s-export").addEventListener("click", async () => {
    const btn = container.querySelector("#s-export");
    btn.disabled = true; btn.textContent = "Exporting…";
    const data = {};
    await Promise.all(ALL_COLLECTIONS.map(async (c) => {
      data[c] = await store.all(c);
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindbloom-data.json";
    a.click();
    btn.disabled = false; btn.textContent = "Export my data (JSON)";
  });

  container.querySelector("#s-signout").addEventListener("click", async () => {
    await authService.signOut();
    onSignOut();
  });
}
