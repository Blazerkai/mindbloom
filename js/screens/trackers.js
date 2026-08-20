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
    const goal = 2000;
    const today = await waterRepo.today();
    const ml = today?.ml || 0;
    body.innerHTML = `
      <div class="glass-card" style="text-align:center;">
        <h3><span id="water-ml">${ml}</span> ml <span class="muted" style="font-size:0.9rem;">/ ${goal}ml goal</span></h3>
        <div class="xp-bar"><div id="water-bar-fill" style="width:${Math.min(100, (ml / goal) * 100)}%"></div></div>
        <div class="grid cols-4 section">
          ${[100, 250, 500, 750].map((n) => `<button class="ghost-btn" data-add="${n}">+${n}ml</button>`).join("")}
        </div>
      </div>`;
    const mlLabel = body.querySelector("#water-ml");
    const barFill = body.querySelector("#water-bar-fill");

    body.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const updated = await waterRepo.addMl(parseInt(btn.dataset.add, 10));
        btn.disabled = false;
        // update the existing bar/number in place (rather than re-rendering the
        // card) so the width transition actually animates instead of snapping
        mlLabel.textContent = updated.ml;
        barFill.style.width = Math.min(100, (updated.ml / goal) * 100) + "%";
        if (window.gsap) window.gsap.fromTo(mlLabel, { scale: 1.3, color: "var(--accent)" }, { scale: 1, color: "var(--text-hi)", duration: 0.4, ease: "power2.out" });
        await grantXpAndCelebrate(5, "water log");
      });
    });
  }

  function drawSleep(body) {
    body.innerHTML = `
      <div class="glass-card">
        <h3>Log last night's sleep</h3>
        <input id="sleep-hours" type="number" step="0.5" placeholder="Hours slept (e.g. 7.5)" aria-label="Hours slept" />
        <select id="sleep-quality" aria-label="Sleep quality">
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
        <div class="flex-between"><label class="muted" for="mood-val" style="margin:0;">Mood</label><span class="pill" id="mood-val-out">6</span></div>
        <input id="mood-val" type="range" min="1" max="10" value="6" />
        <div class="flex-between"><label class="muted" for="energy-val" style="margin:0;">Energy</label><span class="pill" id="energy-val-out">6</span></div>
        <input id="energy-val" type="range" min="1" max="10" value="6" />
        <div class="flex-between"><label class="muted" for="stress-val" style="margin:0;">Stress</label><span class="pill" id="stress-val-out">4</span></div>
        <input id="stress-val" type="range" min="1" max="10" value="4" />
        <textarea id="mood-note" placeholder="Anything on your mind? (optional)" aria-label="Additional notes about your mood"></textarea>
        <button id="mood-save" class="gradient-btn">Check in</button>
      </div>`;
    [["mood-val", "mood-val-out"], ["energy-val", "energy-val-out"], ["stress-val", "stress-val-out"]].forEach(([sliderId, outId]) => {
      const slider = body.querySelector(`#${sliderId}`);
      const out = body.querySelector(`#${outId}`);
      slider.addEventListener("input", () => { out.textContent = slider.value; });
    });
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
