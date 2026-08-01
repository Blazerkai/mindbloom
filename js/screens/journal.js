import { journalRepo } from "../repositories.js";
import { analyzeJournalEntry } from "../ai.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { aiBanner, pill } from "../components.js";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Journal AI</h2><p class="muted">Write freely — AI analyzes emotional trends automatically</p></div>
    <div class="glass-card section">
      <textarea id="journal-text" rows="4" placeholder="What's on your mind today?"></textarea>
      <button id="journal-save" class="gradient-btn">Save & analyze</button>
      <div id="journal-analysis" style="margin-top:0.8rem;"></div>
    </div>
    <div class="section">
      <h3>Recent entries</h3>
      <div class="list" id="journal-list"></div>
    </div>
  `;

  await drawList();

  container.querySelector("#journal-save").addEventListener("click", async () => {
    const text = container.querySelector("#journal-text").value.trim();
    if (!text) return;
    const btn = container.querySelector("#journal-save");
    btn.disabled = true; btn.textContent = "Analyzing…";
    const analysis = await analyzeJournalEntry(text);
    await journalRepo.add(text);
    await grantXpAndCelebrate(20, "journal entry");
    container.querySelector("#journal-text").value = "";
    container.querySelector("#journal-analysis").innerHTML =
      aiBanner("AI reflection", `${analysis.reflection}
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${pill("Stress: " + analysis.stress)}${pill("Confidence: " + analysis.confidence)}${pill("Motivation: " + analysis.motivation)}${pill("Happiness: " + analysis.happiness)}
      </div>`);
    btn.disabled = false; btn.textContent = "Save & analyze";
    await drawList();
  });

  async function drawList() {
    const entries = await journalRepo.history(10);
    container.querySelector("#journal-list").innerHTML = entries.length
      ? entries.map((e) => `<div class="list-item"><div class="main"><div class="title">${escapeHtml(e.text.slice(0, 90))}${e.text.length > 90 ? "…" : ""}</div><div class="sub">${e.date}</div></div></div>`).join("")
      : `<p class="muted">No entries yet — write your first one above.</p>`;
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
