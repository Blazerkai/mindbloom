import { buildWellbeingSnapshot, computeBurnout, generateTodayInsight } from "../ai.js";
import { profileRepo, studyPlannerRepo, playerRepo, leaderboardRepo } from "../repositories.js";
import { statTile, skeleton, aiBanner } from "../components.js";
import { stageForLevel } from "./character.js";
import { capitalize } from "../utils.js";

export async function render(container) {
  const [profile, player] = await Promise.all([profileRepo.get(), playerRepo.get()]);
  container.innerHTML = `
    <div class="screen-title">
      <div><h2>Welcome back, ${capitalize(profile?.name) || "Bloomer"}</h2><p class="muted">Here's your wellbeing snapshot today</p></div>
    </div>
    <div id="ai-banner" class="section">${skeleton("70px")}</div>
    <div class="grid cols-4 section" id="quick-stats"></div>
    <div class="grid cols-3 section">
      <div class="glass-card" id="character-preview"></div>
      <div class="glass-card" id="exam-preview"></div>
      <div class="glass-card" id="league-preview"></div>
    </div>
  `;

  const snapshot = await buildWellbeingSnapshot();

  container.querySelector("#quick-stats").innerHTML =
    statTile(player.level, "Level") +
    statTile(player.streak, "Day streak") +
    statTile(player.coins, "Coins") +
    statTile(Math.round(snapshot.avgSleep * 10) / 10 + "h", "Avg sleep");

  const stage = stageForLevel(player.level);
  container.querySelector("#character-preview").innerHTML = `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Character</div><h4>${player.title || stage.title}</h4><a href="#/character" class="ghost-btn small-btn">View</a>`;

  const exams = (await studyPlannerRepo.exams()).filter((e) => !e.done);
  container.querySelector("#exam-preview").innerHTML = exams.length
    ? `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Upcoming exam</div><h4>${exams[0].title}</h4><p class="muted">${exams[0].dueDate}</p>`
    : `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Upcoming exam</div><p class="muted">None scheduled</p>`;

  const board = await leaderboardRepo.global();
  const myRank = board.findIndex((r) => r.isMe) + 1;
  container.querySelector("#league-preview").innerHTML = `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Current league</div><h4>${myRank > 0 ? `Rank #${myRank}` : "Unranked"}</h4><a href="#/social" class="ghost-btn small-btn">Leaderboard</a>`;

  const insight = await generateTodayInsight(snapshot, computeBurnout(snapshot));
  container.querySelector("#ai-banner").innerHTML = aiBanner("Today's AI insight", insight);
}
