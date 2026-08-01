import { authService } from "../authService.js";
import { profileRepo } from "../repositories.js";
import { GEMINI_API_KEY } from "../config.js";
import { hasSupabase } from "../supabaseClient.js";

export async function render(container, onSignOut) {
  const profile = await profileRepo.get();
  container.innerHTML = `
    <div class="screen-title"><h2>Settings</h2></div>
    <div class="glass-card section">
      <h3>Profile</h3>
      <input id="s-name" placeholder="Name" value="${profile?.name || ""}" />
      <input id="s-school" placeholder="School" value="${profile?.school || ""}" />
      <input id="s-grade" placeholder="Grade" value="${profile?.grade || ""}" />
      <button id="s-save" class="gradient-btn">Save</button>
    </div>
    <div class="glass-card section">
      <h3>Backend status</h3>
      <p>${hasSupabase ? '<span class="pill good">Supabase connected</span>' : '<span class="pill warn">Running on local storage — add Supabase credentials in js/config.js</span>'}</p>
      <p>${GEMINI_API_KEY ? '<span class="pill good">Gemini connected</span>' : '<span class="pill warn">AI running on local fallback — add a Gemini key in js/config.js</span>'}</p>
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

  container.querySelector("#s-export").addEventListener("click", () => {
    const data = {};
    Object.keys(localStorage).filter((k) => k.startsWith("mindbloom:")).forEach((k) => (data[k] = JSON.parse(localStorage.getItem(k))));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindbloom-data.json";
    a.click();
  });

  container.querySelector("#s-signout").addEventListener("click", async () => {
    await authService.signOut();
    onSignOut();
  });
}
