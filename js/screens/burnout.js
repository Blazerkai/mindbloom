import { buildWellbeingSnapshot, computeBurnout } from "../ai.js";
import { gauge, listItem } from "../components.js";

export async function render(container) {
  const snapshot = await buildWellbeingSnapshot();
  const burnout = computeBurnout(snapshot);

  container.innerHTML = `
    <div class="screen-title"><h2>Burnout prediction</h2><p class="muted">AI-analyzed from your last 7 days</p></div>
    <div class="glass-card" style="text-align:center;">
      ${gauge(burnout.score, `${burnout.level} risk`)}
      <div class="pill ${burnout.level === "High" ? "danger" : burnout.level === "Medium" ? "warn" : "good"}" style="margin-top:0.6rem;">Burnout risk: ${burnout.score}%</div>
    </div>
    <div class="grid cols-2 section">
      <div class="glass-card">
        <h3>Why</h3>
        <div class="list">${burnout.reasons.map((r) => listItem({ iconName: "alertTriangle", title: r })).join("")}</div>
      </div>
      <div class="glass-card">
        <h3>Recommendations</h3>
        <div class="list">${burnout.recommendations.map((r) => listItem({ iconName: "checkCircle", title: r })).join("")}</div>
      </div>
    </div>
  `;
}
