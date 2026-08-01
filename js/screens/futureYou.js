import { buildWellbeingSnapshot, computeBurnout, computeLifeScore, computeFutureYou } from "../ai.js";
import { gauge, statTile, aiBanner } from "../components.js";

export async function render(container) {
  const snapshot = await buildWellbeingSnapshot();
  const burnout = computeBurnout(snapshot);
  const lifeScore = computeLifeScore(snapshot);
  const future = computeFutureYou(snapshot, burnout, lifeScore);

  container.innerHTML = `
    <div class="screen-title"><h2>Future you</h2><p class="muted">If your current habits continue for the next 2 weeks</p></div>
    <div class="grid cols-2 section">
      <div class="glass-card">
        <h3 style="text-align:center;">Current you</h3>
        <div class="grid cols-2">
          ${statTile(burnout.score + "%", "Burnout")}
          ${statTile(lifeScore.overall, "Life score")}
        </div>
      </div>
      <div class="glass-card" style="border-color:var(--accent);">
        <h3 style="text-align:center;">Future you</h3>
        <div class="grid cols-2">
          ${statTile(future.predictedBurnout + "%", "Predicted burnout")}
          ${statTile(future.predictedLifeScore, "Predicted life score")}
        </div>
      </div>
    </div>
    <div class="grid cols-3 section">
      <div class="glass-card" style="text-align:center;">${gauge(future.predictedFocus, "Predicted focus")}</div>
      <div class="glass-card" style="text-align:center;">${gauge(future.predictedExamPerformance, "Predicted exam score")}</div>
      <div class="glass-card" style="text-align:center;padding-top:2.2rem;">
        <div class="pill ${future.predictedMood === "Improving" ? "good" : future.predictedMood === "Declining" ? "danger" : ""}">Predicted mood: ${future.predictedMood}</div>
      </div>
    </div>
    <div class="section">${aiBanner("AI explanation", explain(future, burnout, lifeScore))}</div>
  `;
}

function explain(future, burnout, lifeScore) {
  if (future.direction > 0) {
    return `Your recent consistency is paying off — if you keep this pace, burnout risk could drop from ${burnout.score}% to about ${future.predictedBurnout}%, and your life score could climb to ${future.predictedLifeScore}.`;
  }
  if (future.direction < 0) {
    return `Your recent trends suggest rising strain — without a change, burnout risk could climb toward ${future.predictedBurnout}% over the next two weeks. Small adjustments now (sleep, breaks, hydration) can shift this.`;
  }
  return `You're on a stable path. Life score is projected to stay near ${future.predictedLifeScore} if nothing changes — a solid base to build extra habits on.`;
}
