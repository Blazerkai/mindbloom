import { buildWellbeingSnapshot, computeBurnout, computeLifeScore, generateWeeklyReport } from "../ai.js";
import { reportsRepo, playerRepo } from "../repositories.js";
import { weekKey } from "../utils.js";
import { listItem } from "../components.js";

export async function render(container) {
  container.innerHTML = `<div class="screen-title"><h2>Weekly AI report</h2><p class="muted">Generated every week from your data</p></div>
    <div class="skel" style="height:300px;border-radius:14px;"></div>`;

  let report = await reportsRepo.get(weekKey());
  if (!report) {
    const snapshot = await buildWellbeingSnapshot();
    const burnout = computeBurnout(snapshot);
    const lifeScore = computeLifeScore(snapshot);
    report = await generateWeeklyReport(snapshot, burnout, lifeScore);
    report.week = weekKey();
    await reportsRepo.save(report);
  }

  const player = await playerRepo.get();

  container.innerHTML = `
    <div class="screen-title">
      <div><h2>Weekly AI report</h2><p class="muted">Week ${report.week}</p></div>
      <button id="export-pdf" class="ghost-btn">Export as PDF</button>
    </div>
    <div id="report-content">
      <div class="grid cols-3 section">
        <div class="glass-card stat-tile"><div class="value">${report.lifeScore}</div><div class="label">Life score</div></div>
        <div class="glass-card stat-tile"><div class="value">${report.burnout.level}</div><div class="label">Burnout risk</div></div>
        <div class="glass-card stat-tile"><div class="value">${player.totalXp}</div><div class="label">Total XP</div></div>
      </div>
      <div class="glass-card section">
        <h3>AI summary</h3>
        <p style="color:var(--text-hi);">${report.summary}</p>
      </div>
      <div class="grid cols-2 section">
        <div class="glass-card">
          <h3>This week's numbers</h3>
          <div class="list">
            ${listItem({ iconName: "pulse", title: "Avg mood", right: `<span class="sub">${report.avgMood.toFixed(1)}/10</span>` })}
            ${listItem({ iconName: "moon", title: "Avg sleep", right: `<span class="sub">${report.avgSleep.toFixed(1)}h</span>` })}
            ${listItem({ iconName: "droplet", title: "Avg hydration", right: `<span class="sub">${Math.round(report.avgWater)}ml</span>` })}
            ${listItem({ iconName: "target", title: "Focus minutes", right: `<span class="sub">${report.focusMinutes} min</span>` })}
          </div>
        </div>
        <div class="glass-card">
          <h3>Life score breakdown</h3>
          <div class="list">
            ${Object.entries(report.breakdown).map(([label, val]) => `
              <div class="list-item"><div class="main"><div class="flex-between"><span class="title">${label}</span><span class="sub">${val}</span></div><div class="xp-bar"><div style="width:${val}%"></div></div></div></div>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="glass-card section">
        <h3>Biggest improvement / weakest area</h3>
        <p>Strongest: <strong style="color:var(--text-hi);">${report.strongest}</strong> &nbsp;·&nbsp; Focus next on: <strong style="color:var(--text-hi);">${report.weakest}</strong></p>
      </div>
      <div class="glass-card section">
        <h3>AI recommendations</h3>
        <div class="list">${report.recommendations.map((r) => listItem({ iconName: "checkCircle", title: r })).join("")}</div>
      </div>
    </div>
  `;

  container.querySelector("#export-pdf").addEventListener("click", () => exportPdf(report));
}

function exportPdf(report) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>MindBloom Weekly Report — ${report.week}</title>
    <style>
      body { font-family: -apple-system, sans-serif; padding: 2rem; color: #14151c; }
      h1 { color: #6366f1; } h2 { margin-top: 1.6rem; }
      .stat { display: inline-block; margin-right: 1.5rem; }
      table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
      td { padding: 4px 0; }
    </style></head><body>
    <h1>MindBloom Weekly Report</h1>
    <p>Week ${report.week}</p>
    <div class="stat"><strong>Life Score:</strong> ${report.lifeScore}/100</div>
    <div class="stat"><strong>Burnout Risk:</strong> ${report.burnout.level} (${report.burnout.score}%)</div>
    <h2>AI Summary</h2><p>${report.summary}</p>
    <h2>Numbers</h2>
    <table>
      <tr><td>Avg Mood</td><td>${report.avgMood.toFixed(1)}/10</td></tr>
      <tr><td>Avg Sleep</td><td>${report.avgSleep.toFixed(1)}h</td></tr>
      <tr><td>Avg Hydration</td><td>${Math.round(report.avgWater)}ml</td></tr>
      <tr><td>Focus Minutes</td><td>${report.focusMinutes} min</td></tr>
    </table>
    <h2>Life Score Breakdown</h2>
    <table>${Object.entries(report.breakdown).map(([k, v]) => `<tr><td>${k}</td><td>${v}/100</td></tr>`).join("")}</table>
    <h2>Recommendations</h2>
    <ul>${report.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>
    </body></html>
  `);
  win.document.close();
  win.focus();
  win.print();
}
