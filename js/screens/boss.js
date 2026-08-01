import { bossRepo, playerRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { toast } from "../fx.js";
import { icon } from "../icons.js";

export const BOSSES = [
  {
    id: "burnout_beast",
    name: "Burnout",
    icon: "flame",
    maxHp: 300,
    story: "Fed by too many late nights, it grows stronger every hour of skipped sleep.",
    weaknesses: [
      { label: "Sleep 7+ hours", dmg: 40 },
      { label: "Meditate 5 minutes", dmg: 25 },
      { label: "Drink water", dmg: 15 },
    ],
  },
  {
    id: "stress_dragon",
    name: "Stress",
    icon: "zap",
    maxHp: 350,
    story: "Fueled by anxiety — every calm, deliberate action wears it down.",
    weaknesses: [
      { label: "Mood check-in", dmg: 20 },
      { label: "Exercise", dmg: 30 },
      { label: "Gratitude journal", dmg: 25 },
    ],
  },
  {
    id: "distraction_demon",
    name: "Distraction",
    icon: "target",
    maxHp: 280,
    story: "Thrives on scattered focus — a single completed Pomodoro sends it reeling.",
    weaknesses: [
      { label: "Pomodoro session", dmg: 35 },
      { label: "Study session", dmg: 30 },
    ],
  },
];

export const CURRENT_BOSS = BOSSES[new Date().getDay() % BOSSES.length];

export async function render(container) {
  const boss = CURRENT_BOSS;
  const state = await bossRepo.state(boss.id, boss.maxHp);
  const pct = (state.hp / boss.maxHp) * 100;

  container.innerHTML = `
    <div class="screen-title"><h2>Boss battle</h2><p class="muted">Weekly boss — defeat it with healthy habits</p></div>
    <div class="glass-card" style="text-align:center;" id="boss-card">
      <div class="boss-icon-wrap" id="boss-icon">${icon(boss.icon, { size: 32 })}</div>
      <h2>${boss.name}</h2>
      <p style="max-width:480px;margin:0 auto 1rem;">${boss.story}</p>
      <div class="boss-hp-bar"><div style="width:${pct}%"></div></div>
      <p class="muted">${state.hp} / ${boss.maxHp} HP</p>
      ${state.defeated ? `<div class="pill good" style="margin-top:0.6rem;">Defeated — rewards claimed this week</div>` : ""}
    </div>
    <div class="section">
      <h3>Weaknesses — attack with healthy habits</h3>
      <div class="grid cols-3" id="weakness-grid"></div>
    </div>
  `;

  const grid = container.querySelector("#weakness-grid");
  boss.weaknesses.forEach((w) => {
    const btn = document.createElement("button");
    btn.className = "glass-card ghost-btn";
    btn.style.cssText = "display:block;width:100%;text-align:center;padding:1rem;height:auto;";
    btn.innerHTML = `<div>${w.label}</div><div class="muted">-${w.dmg} HP</div>`;
    btn.disabled = state.defeated;
    btn.addEventListener("click", async () => {
      const updated = await bossRepo.damage(boss.id, boss.maxHp, w.dmg);
      const iconEl = container.querySelector("#boss-icon");
      iconEl.classList.add("shake");
      setTimeout(() => iconEl.classList.remove("shake"), 350);
      container.querySelector(".boss-hp-bar > div").style.width = `${(updated.hp / boss.maxHp) * 100}%`;
      container.querySelector(".boss-hp-bar + p").textContent = `${updated.hp} / ${boss.maxHp} HP`;
      await grantXpAndCelebrate(8, "boss damage");
      if (updated.hp === 0) {
        await playerRepo.addCoins(50);
        toast("Boss defeated — +50 coins", "success");
        render(container);
      }
    });
    grid.appendChild(btn);
  });
}
