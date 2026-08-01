import { ACHIEVEMENTS } from "../achievements.js";
import { achievementsRepo } from "../repositories.js";
import { icon } from "../icons.js";

export async function render(container) {
  const unlockedList = await achievementsRepo.unlocked();
  const unlocked = new Set(unlockedList);
  container.innerHTML = `
    <div class="screen-title"><h2>Achievements</h2><p class="muted">${unlocked.size} / ${ACHIEVEMENTS.length} unlocked</p></div>
    <div class="grid cols-4" id="ach-grid"></div>
  `;

  container.querySelector("#ach-grid").innerHTML = ACHIEVEMENTS
    .filter((a) => !a.hidden || unlocked.has(a.id))
    .map((a) => `
      <div class="glass-card ach-badge ${unlocked.has(a.id) ? "unlocked" : ""}" title="${a.desc}">
        <div class="icon-wrap">${icon(a.icon, { size: 22 })}</div>
        <div class="title" style="font-size:0.78rem;font-weight:600;color:var(--text-hi);">${a.title}</div>
        <div class="tier tier-${a.tier}">${a.tier}</div>
      </div>
    `).join("");
}
