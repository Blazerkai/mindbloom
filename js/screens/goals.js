import { goalsRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { icon } from "../icons.js";

const QUOTES = [
  "Small steps, repeated daily, beat big plans done once.",
  "You don't have to be perfect today — just a little better than yesterday.",
  "Discipline is choosing between what you want now and what you want most.",
  "Rest is part of the work, not a break from it.",
  "Progress hides in the days that feel ordinary.",
  "Your future self is built by what you do in the next 10 minutes.",
  "Consistency turns effort into identity.",
  "Every quest completed today is proof you can do the next one.",
  "You're not behind — you're on your own timeline.",
  "Take the next right step. That's all momentum ever needs.",
];

function dailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Goals & Motivation</h2><p class="muted">Set targets, track progress, get a daily nudge</p></div>
    <div class="ai-banner section"><span class="icon-wrap">${icon("sparkles", { size: 20 })}</span><div><h4>Today's motivation</h4><p>${dailyQuote()}</p></div></div>
    <div class="glass-card section">
      <h3>Add a goal</h3>
      <input id="goal-text" placeholder="e.g. Read 12 books this year" aria-label="Goal description" />
      <input id="goal-target" type="number" min="1" placeholder="Target (e.g. 12)" aria-label="Goal target number" />
      <button id="goal-add" class="gradient-btn">Add goal</button>
    </div>
    <div class="list" id="goal-list"></div>
  `;

  await drawList();

  container.querySelector("#goal-add").addEventListener("click", async () => {
    const text = container.querySelector("#goal-text").value.trim();
    const target = parseInt(container.querySelector("#goal-target").value, 10) || 1;
    if (!text) return;
    await goalsRepo.add(text, target);
    await grantXpAndCelebrate(10, "goal set");
    container.querySelector("#goal-text").value = "";
    container.querySelector("#goal-target").value = "";
    await drawList();
  });

  async function drawList() {
    const goals = await goalsRepo.all();
    const list = container.querySelector("#goal-list");
    list.innerHTML = goals.length
      ? goals.map((g) => `
        <div class="glass-card">
          <div class="flex-between">
            <div>
              <div style="font-weight:600;color:var(--text-hi);${g.done ? "text-decoration:line-through;opacity:0.6;" : ""}">${escapeHtml(g.text)}</div>
              <div class="muted" style="font-size:0.78rem;">${g.progress}/${g.target}</div>
            </div>
            <div style="display:flex;gap:0.4rem;">
              ${!g.done ? `<button class="ghost-btn small-btn" data-inc="${g.id}">+1</button>` : `<span class="pill good">Done</span>`}
              <button class="icon-btn" data-remove="${g.id}">${icon("x", { size: 14 })}</button>
            </div>
          </div>
          <div class="xp-bar" style="margin-top:0.6rem;"><div style="width:${Math.min(100, (g.progress / g.target) * 100)}%"></div></div>
        </div>`).join("")
      : `<p class="muted">No goals yet — add one above.</p>`;

    list.querySelectorAll("[data-inc]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const g = goals.find((x) => x.id === btn.dataset.inc);
        const progress = Math.min(g.target, g.progress + 1);
        const done = progress >= g.target;
        await goalsRepo.update(g.id, { progress, done });
        if (done) await grantXpAndCelebrate(30, "goal completed", 15);
        else await grantXpAndCelebrate(5, "goal progress");
        await drawList();
      });
    });
    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await goalsRepo.remove(btn.dataset.remove);
        await drawList();
      });
    });
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
