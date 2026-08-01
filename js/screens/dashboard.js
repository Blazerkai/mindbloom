import { buildWellbeingSnapshot, computeBurnout, computeLifeScore, computeFutureYou, generateTodayInsight } from "../ai.js";
import { profileRepo, questRepo, studyPlannerRepo, playerRepo, leaderboardRepo } from "../repositories.js";
import { gauge, statTile, sectionTitle, skeleton, aiBanner } from "../components.js";
import { icon } from "../icons.js";
import { CURRENT_BOSS } from "./boss.js";

export async function render(container) {
  const [profile, player] = await Promise.all([profileRepo.get(), playerRepo.get()]);
  container.innerHTML = `
    <div class="screen-title">
      <div><h2>Welcome back, ${profile?.name || "Bloomer"}</h2><p class="muted">Here's your wellbeing snapshot today</p></div>
    </div>
    <div id="ai-banner" class="section">${skeleton("70px")}</div>
    <div class="grid cols-4 section" id="quick-stats"></div>
    <div class="grid cols-2 section">
      <div class="glass-card" id="burnout-preview">${skeleton("160px")}</div>
      <div class="glass-card" id="lifescore-preview">${skeleton("160px")}</div>
    </div>
    <div class="grid cols-2 section">
      <div class="glass-card" id="mission-preview">${skeleton("140px")}</div>
      <div class="glass-card" id="futureyou-preview">${skeleton("140px")}</div>
    </div>
    <div class="grid cols-3 section">
      <div class="glass-card" id="boss-preview"></div>
      <div class="glass-card" id="exam-preview"></div>
      <div class="glass-card" id="league-preview"></div>
    </div>
  `;

  const snapshot = await buildWellbeingSnapshot();
  const burnout = computeBurnout(snapshot);
  const lifeScore = computeLifeScore(snapshot);
  const futureYou = computeFutureYou(snapshot, burnout, lifeScore);

  container.querySelector("#quick-stats").innerHTML =
    statTile(player.level, "Level") +
    statTile(player.streak, "Day streak") +
    statTile(player.coins, "Coins") +
    statTile(Math.round(snapshot.avgSleep * 10) / 10 + "h", "Avg sleep");

  container.querySelector("#burnout-preview").innerHTML = `
    ${sectionTitle("Burnout risk", `<a href="#/burnout" class="ghost-btn small-btn">Details</a>`)}
    <div style="display:flex;align-items:center;gap:1rem;">
      ${gauge(burnout.score, burnout.level)}
      <div><p style="color:var(--text-hi);">${burnout.reasons[0] || ""}</p></div>
    </div>`;

  container.querySelector("#lifescore-preview").innerHTML = `
    ${sectionTitle("MindBloom score", `<a href="#/lifescore" class="ghost-btn small-btn">Details</a>`)}
    <div style="display:flex;align-items:center;gap:1rem;">
      ${gauge(lifeScore.overall, "/ 100")}
      <div><p style="color:var(--text-hi);">Strongest: ${Object.entries(lifeScore.breakdown).sort((a,b)=>b[1]-a[1])[0][0]}</p></div>
    </div>`;

  const quests = await questRepo.todaysQuests();
  const done = quests.filter((q) => q.completed).length;
  container.querySelector("#mission-preview").innerHTML = `
    ${sectionTitle("Today's mission", `<a href="#/quests" class="ghost-btn small-btn">Open</a>`)}
    <p>${done}/${quests.length || 3} quests complete</p>
    <div class="xp-bar"><div style="width:${quests.length ? (done/quests.length)*100 : 0}%"></div></div>`;

  container.querySelector("#futureyou-preview").innerHTML = `
    ${sectionTitle("Future you", `<a href="#/future-you" class="ghost-btn small-btn">Preview</a>`)}
    <p>Predicted life score <strong style="color:var(--text-hi);">${futureYou.predictedLifeScore}</strong> · mood ${futureYou.predictedMood.toLowerCase()}</p>`;

  const boss = CURRENT_BOSS;
  container.querySelector("#boss-preview").innerHTML = `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Current boss</div><h4>${boss.name}</h4><a href="#/boss" class="ghost-btn small-btn">Battle</a>`;

  const exams = (await studyPlannerRepo.exams()).filter((e) => !e.done);
  container.querySelector("#exam-preview").innerHTML = exams.length
    ? `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Upcoming exam</div><h4>${exams[0].title}</h4><p class="muted">${exams[0].dueDate}</p>`
    : `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Upcoming exam</div><p class="muted">None scheduled</p>`;

  const board = await leaderboardRepo.global();
  const myRank = board.findIndex((r) => r.isMe) + 1;
  container.querySelector("#league-preview").innerHTML = `<div class="muted" style="font-size:0.72rem;text-transform:uppercase;">Current league</div><h4>Rank #${myRank}</h4><a href="#/social" class="ghost-btn small-btn">Leaderboard</a>`;

  const insight = await generateTodayInsight(snapshot, burnout);
  container.querySelector("#ai-banner").innerHTML = aiBanner("Today's AI insight", insight);
}
