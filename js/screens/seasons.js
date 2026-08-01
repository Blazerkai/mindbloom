import { playerRepo, seasonRepo, leaderboardRepo } from "../repositories.js";
import { listItem } from "../components.js";

const PASS_TIERS = [100, 250, 500, 900, 1400, 2000, 2700, 3500, 4500, 6000];
const PASS_REWARDS = ["20 coins", "Frame", "40 coins", "Particle trail", "Badge", "80 coins", "Background", "Title", "150 coins", "Legendary badge"];

export async function render(container) {
  const [player, board] = await Promise.all([playerRepo.get(), leaderboardRepo.global()]);
  const season = seasonRepo.current();
  const rank = board.findIndex((r) => r.isMe) + 1;

  container.innerHTML = `
    <div class="screen-title"><h2>Season ${season}</h2><p class="muted">Monthly season pass — resets each month</p></div>
    <div class="glass-card section">
      <div class="flex-between"><h3 style="margin:0;">Season XP</h3><span class="muted">${player.seasonXp} XP · Rank #${rank}</span></div>
    </div>
    <div class="section">
      <h3>Season pass</h3>
      <div class="list" id="pass-list"></div>
    </div>
  `;

  container.querySelector("#pass-list").innerHTML = PASS_TIERS.map((t, i) => {
    const unlocked = player.seasonXp >= t;
    return listItem({
      iconName: unlocked ? "checkCircle" : "lock",
      title: `Tier ${i + 1} — ${t} XP`,
      sub: PASS_REWARDS[i],
      right: unlocked ? `<span class="pill good">Unlocked</span>` : "",
    });
  }).join("");
}
