import { playerRepo, profileRepo } from "../repositories.js";
import { aiBanner } from "../components.js";
import { icon } from "../icons.js";

export const EVOLUTION_STAGES = [
  { minLevel: 1, icon: "leaf", title: "Novice Bloomer" },
  { minLevel: 5, icon: "leaf", title: "Growing Sprout" },
  { minLevel: 10, icon: "sparkles", title: "Blossoming Mind" },
  { minLevel: 20, icon: "target", title: "Focused Achiever" },
  { minLevel: 35, icon: "star", title: "Radiant Achiever" },
  { minLevel: 50, icon: "flame", title: "Blazing Bloom" },
  { minLevel: 75, icon: "crown", title: "MindBloom Legend" },
];

export function stageForLevel(level) {
  return [...EVOLUTION_STAGES].reverse().find((s) => level >= s.minLevel) || EVOLUTION_STAGES[0];
}

export async function render(container) {
  const [player, profile] = await Promise.all([playerRepo.get(), profileRepo.get()]);
  const stage = stageForLevel(player.level);
  const nextStage = EVOLUTION_STAGES.find((s) => s.minLevel > player.level);

  container.innerHTML = `
    <div class="screen-title"><h2>Character evolution</h2><p class="muted">You are the character — your habits shape your progress</p></div>
    <div class="glass-card avatar-stage">
      <div class="avatar-icon-wrap">${icon(stage.icon, { size: 36 })}</div>
      <h2>${profile?.name || "Bloomer"}</h2>
      <p class="pill gold">${player.title || stage.title}</p>
      <div style="max-width:360px;margin:0.8rem auto 0;">
        <div class="xp-bar"><div style="width:${player.xpForNext ? (player.xp/player.xpForNext)*100 : 0}%"></div></div>
        <p class="muted">Level ${player.level} · ${player.xp}/${player.xpForNext || 100} XP</p>
      </div>
    </div>
    <div class="section">
      <h3>Evolution path</h3>
      <div class="grid cols-4" id="evolution-grid"></div>
    </div>
    ${nextStage ? `<div class="section">${aiBanner("Next evolution", `Reach level ${nextStage.minLevel} to unlock ${nextStage.title}.`)}</div>` : ""}
  `;

  container.querySelector("#evolution-grid").innerHTML = EVOLUTION_STAGES.map((s) => `
    <div class="glass-card ach-badge ${player.level >= s.minLevel ? "unlocked" : ""}">
      <div class="icon-wrap">${icon(s.icon, { size: 22 })}</div>
      <div class="title" style="font-size:0.78rem;font-weight:600;color:var(--text-hi);">${s.title}</div>
      <div class="tier">Lvl ${s.minLevel}+</div>
    </div>
  `).join("");
}
