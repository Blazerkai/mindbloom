import { waterRepo, sleepRepo, moodRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";

let activeTab = "water";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Trackers</h2><p class="muted">Log daily habits — each one feeds the AI engine</p></div>
    <div class="auth-tabs section" id="tracker-tabs">
      <button data-tab="water">Water</button>
      <button data-tab="sleep">Sleep</button>
      <button data-tab="mood">Mood</button>
    </div>
    <div id="tracker-body"></div>
  `;

  container.querySelectorAll("#tracker-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => { activeTab = btn.dataset.tab; drawTabs(); drawBody(); });
  });
  drawTabs();
  await drawBody();

  function drawTabs() {
    container.querySelectorAll("#tracker-tabs button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === activeTab);
    });
  }

  async function drawBody() {
    const body = container.querySelector("#tracker-body");
    if (activeTab === "water") return drawWater(body);
    if (activeTab === "sleep") return drawSleep(body);
    drawMood(body);
  }

  async function drawWater(body) {
    const today = await waterRepo.today();
    const ml = today?.ml || 0;
    const goal = 2000;
    body.innerHTML = `
      <div class="glass-card" style="text-align:center;">
        <h3>${ml} ml <span class="muted" style="font-size:0.9rem;">/ ${goal}ml goal</span></h3>
        <div class="xp-bar"><div style="width:${Math.min(100, (ml/goal)*100)}%"></div></div>
        <div class="grid cols-4 section">
          ${[100, 250, 500, 750].map((n) => `<button class="ghost-btn" data-add="${n}">+${n}ml</button>`).join("")}
        </div>
      </div>`;
    body.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await waterRepo.addMl(parseInt(btn.dataset.add, 10));
        await grantXpAndCelebrate(5, "water log");
        drawWater(body);
      });
    });
  }

  function drawSleep(body) {
    body.innerHTML = `
      <div class="glass-card">
        <h3>Log last night's sleep</h3>
        <input id="sleep-hours" type="number" step="0.5" placeholder="Hours slept (e.g. 7.5)" />
        <select id="sleep-quality">
          <option value="good">Good quality</option>
          <option value="okay">Okay quality</option>
          <option value="poor">Poor quality</option>
        </select>
        <button id="sleep-save" class="gradient-btn">Save</button>
      </div>`;
    body.querySelector("#sleep-save").addEventListener("click", async () => {
      const hours = parseFloat(body.querySelector("#sleep-hours").value);
      if (!hours) return;
      await sleepRepo.logHours(hours, body.querySelector("#sleep-quality").value);
      await grantXpAndCelebrate(10, "sleep log");
      drawSleep(body);
    });
  }

  function drawMood(body) {
    body.innerHTML = `
      <div class="glass-card">
        <h3>How are you feeling?</h3>
        <label class="muted">Mood (1-10)</label>
        <input id="mood-val" type="range" min="1" max="10" value="6" />
        <label class="muted">Energy (1-10)</label>
        <input id="energy-val" type="range" min="1" max="10" value="6" />
        <label class="muted">Stress (1-10)</label>
        <input id="stress-val" type="range" min="1" max="10" value="4" />
        <textarea id="mood-note" placeholder="Anything on your mind? (optional)"></textarea>
        <button id="mood-save" class="gradient-btn">Check in</button>
      </div>`;
    body.querySelector("#mood-save").addEventListener("click", async () => {
      await moodRepo.logMood(
        parseInt(body.querySelector("#mood-val").value, 10),
        parseInt(body.querySelector("#energy-val").value, 10),
        parseInt(body.querySelector("#stress-val").value, 10),
        body.querySelector("#mood-note").value.trim()
      );
      await grantXpAndCelebrate(10, "mood check-in");
      drawMood(body);
    });
  }
}
