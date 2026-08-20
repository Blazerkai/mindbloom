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
    const usedToday = Boolean(state.usedToday?.[w.label]);
    const btn = document.createElement("button");
    btn.className = "glass-card ghost-btn boss-weakness-btn";
    btn.style.cssText = "display:block;width:100%;text-align:center;padding:1rem;height:auto;";
    btn.innerHTML = usedToday
      ? `<div>${w.label}</div><div class="muted">Used today — resets tomorrow</div>`
      : `<div>${w.label}</div><div class="muted">-${w.dmg} HP</div>`;
    btn.disabled = state.defeated || usedToday;
    btn.addEventListener("click", async (ev) => {
      const result = await bossRepo.attack(boss.id, boss.maxHp, w.label, w.dmg);
      if (result.blocked) {
        toast("Already used that today — come back tomorrow", "info");
        btn.disabled = true;
        return;
      }
      btn.disabled = true;
      btn.innerHTML = `<div>${w.label}</div><div class="muted">Used today — resets tomorrow</div>`;

      const card = container.querySelector("#boss-card");
      const iconEl = container.querySelector("#boss-icon");
      spawnDamageNumber(ev.currentTarget, w.dmg);
      if (window.gsap) {
        window.gsap.timeline()
          .to(card, { x: -8, duration: 0.05 })
          .to(card, { x: 8, duration: 0.05 })
          .to(card, { x: -5, duration: 0.05 })
          .to(card, { x: 0, duration: 0.05 });
        window.gsap.fromTo(iconEl, { scale: 1.25 }, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.4)" });
        window.gsap.to(container.querySelector(".boss-hp-bar > div"), {
          width: `${(result.hp / boss.maxHp) * 100}%`, duration: 0.5, ease: "power2.out",
        });
      } else {
        iconEl.classList.add("shake");
        setTimeout(() => iconEl.classList.remove("shake"), 350);
        container.querySelector(".boss-hp-bar > div").style.width = `${(result.hp / boss.maxHp) * 100}%`;
      }
      container.querySelector(".boss-hp-bar + p").textContent = `${result.hp} / ${boss.maxHp} HP`;
      await grantXpAndCelebrate(8, "boss damage");
      if (result.hp === 0) {
        await playerRepo.addCoins(50);
        toast("Boss defeated — +50 coins", "success");
        setTimeout(() => render(container), 900);
      }
    });
    grid.appendChild(btn);
  });
}

function spawnDamageNumber(anchorEl, amount) {
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "dmg-float";
  el.textContent = `-${amount}`;
  el.style.left = rect.left + rect.width / 2 + "px";
  el.style.top = rect.top + "px";
  document.body.appendChild(el);
  if (window.gsap) {
    window.gsap.fromTo(el, { y: 0, opacity: 1, scale: 0.6 }, {
      y: -60, opacity: 0, scale: 1.3, duration: 0.9, ease: "power1.out",
      onComplete: () => el.remove(),
    });
  } else {
    setTimeout(() => el.remove(), 900);
  }
}
