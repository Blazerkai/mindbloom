import { buildWellbeingSnapshot, computeLifeScore } from "../ai.js";
import { gauge, aiBanner } from "../components.js";

export async function render(container) {
  const snapshot = await buildWellbeingSnapshot();
  const score = computeLifeScore(snapshot);

  container.innerHTML = `
    <div class="screen-title"><h2>MindBloom score</h2><p class="muted">Your master wellbeing score, 0-100</p></div>
    <div class="glass-card" style="text-align:center;">
      ${gauge(score.overall, "/ 100")}
    </div>
    <div class="section">
      <h3>Breakdown</h3>
      <div class="list">
        ${Object.entries(score.breakdown).map(([label, val]) => `
          <div class="list-item">
            <div class="main">
              <div class="flex-between"><span class="title">${label}</span><span class="sub">${val}/100</span></div>
              <div class="xp-bar"><div style="width:${val}%"></div></div>
            </div>
          </div>`).join("")}
      </div>
    </div>
    <div class="section">${aiBanner("AI explanation", explain(score))}</div>
  `;
}

function explain(score) {
  const entries = Object.entries(score.breakdown).sort((a, b) => a[1] - b[1]);
  const weakest = entries[0];
  const strongest = entries.at(-1);
  return `Your overall score is ${score.overall}/100. ${strongest[0]} is your strongest area (${strongest[1]}/100) — keep it up. ${weakest[0]} is currently your biggest opportunity (${weakest[1]}/100); small improvements there will move your score the most.`;
}
