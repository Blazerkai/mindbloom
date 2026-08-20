import { journalRepo, gratitudeRepo } from "../repositories.js";
import { analyzeJournalEntry } from "../ai.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { aiBanner, pill } from "../components.js";
import { icon } from "../icons.js";

let activeTab = "journal";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Journal & Gratitude</h2><p class="muted">Reflect freely, or list what you're grateful for</p></div>
    <div class="auth-tabs section" id="journal-tabs">
      <button data-tab="journal">Journal</button>
      <button data-tab="gratitude">Gratitude</button>
    </div>
    <div id="journal-body"></div>
  `;

  container.querySelectorAll("#journal-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => { activeTab = btn.dataset.tab; drawTabs(); drawBody(); });
  });
  drawTabs();
  await drawBody();

  function drawTabs() {
    container.querySelectorAll("#journal-tabs button").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === activeTab));
  }

  async function drawBody() {
    const body = container.querySelector("#journal-body");
    if (activeTab === "gratitude") return drawGratitude(body);
    drawJournal(body);
  }

  function drawJournal(body) {
    body.innerHTML = `
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
    drawJournalList(body);

    body.querySelector("#journal-save").addEventListener("click", async () => {
      const text = body.querySelector("#journal-text").value.trim();
      if (!text) return;
      const btn = body.querySelector("#journal-save");
      btn.disabled = true; btn.textContent = "Analyzing…";
      const analysis = await analyzeJournalEntry(text);
      await journalRepo.add(text);
      await grantXpAndCelebrate(20, "journal entry");
      body.querySelector("#journal-text").value = "";
      body.querySelector("#journal-analysis").innerHTML =
        aiBanner("AI reflection", `${analysis.reflection}
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.5rem;">
          ${pill("Stress: " + analysis.stress)}${pill("Confidence: " + analysis.confidence)}${pill("Motivation: " + analysis.motivation)}${pill("Happiness: " + analysis.happiness)}
        </div>`);
      btn.disabled = false; btn.textContent = "Save & analyze";
      await drawJournalList(body);
    });
  }

  async function drawJournalList(body) {
    const entries = await journalRepo.history(10);
    body.querySelector("#journal-list").innerHTML = entries.length
      ? entries.map((e) => `<div class="list-item"><div class="main"><div class="title">${escapeHtml(e.text.slice(0, 90))}${e.text.length > 90 ? "…" : ""}</div><div class="sub">${e.date}</div></div></div>`).join("")
      : `<p class="muted">No entries yet — write your first one above.</p>`;
  }

  function drawGratitude(body) {
    body.innerHTML = `
      <div class="glass-card section">
        <h3>Three things you're grateful for today</h3>
        <input id="grat-1" placeholder="I'm grateful for…" />
        <input id="grat-2" placeholder="I'm grateful for…" />
        <input id="grat-3" placeholder="I'm grateful for…" />
        <button id="grat-save" class="gradient-btn">Save gratitude list</button>
      </div>
      <div class="section">
        <h3>Past entries</h3>
        <div class="list" id="grat-list"></div>
      </div>
    `;
    drawGratList(body);

    body.querySelector("#grat-save").addEventListener("click", async () => {
      const items = ["#grat-1", "#grat-2", "#grat-3"]
        .map((sel) => body.querySelector(sel).value.trim())
        .filter(Boolean);
      if (!items.length) return;
      await gratitudeRepo.add(items);
      await grantXpAndCelebrate(15, "gratitude entry");
      ["#grat-1", "#grat-2", "#grat-3"].forEach((sel) => (body.querySelector(sel).value = ""));
      await drawGratList(body);
    });
  }

  async function drawGratList(body) {
    const entries = await gratitudeRepo.history(10);
    body.querySelector("#grat-list").innerHTML = entries.length
      ? entries.slice().reverse().map((e) => `
        <div class="list-item">
          <span class="icon-wrap">${icon("feather", { size: 17 })}</span>
          <div class="main"><div class="title">${e.items.map(escapeHtml).join(" · ")}</div><div class="sub">${e.date}</div></div>
        </div>`).join("")
      : `<p class="muted">No gratitude entries yet — add three above.</p>`;
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
