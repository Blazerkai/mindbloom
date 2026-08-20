import { mindfulnessRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { icon } from "../icons.js";

const ACTIVITIES = [
  {
    id: "breathing",
    icon: "wind",
    title: "Box Breathing",
    desc: "A 4-4-4-4 breathing pattern used to calm the nervous system fast.",
    minutes: 2,
    breathing: true,
  },
  {
    id: "grounding",
    icon: "leaf",
    title: "5-4-3-2-1 Grounding",
    desc: "Use your senses to settle an anxious moment.",
    minutes: 3,
    steps: ["Name 5 things you can see", "Name 4 things you can touch", "Name 3 things you can hear", "Name 2 things you can smell", "Name 1 thing you can taste"],
  },
  {
    id: "gratitudePause",
    icon: "feather",
    title: "60-Second Gratitude Pause",
    desc: "A quick reset between study sessions.",
    minutes: 1,
    steps: ["Think of one person you're grateful for", "Think of one small win from today", "Take three slow breaths"],
  },
];

let activeSession = null; // { activity, timer, ... }

export async function render(container) {
  const todaysSessions = await mindfulnessRepo.today();
  container.innerHTML = `
    <div class="screen-title"><h2>Calm & Mindfulness</h2><p class="muted">${todaysSessions.length} session${todaysSessions.length === 1 ? "" : "s"} completed today</p></div>
    <div class="grid cols-2 section" id="activity-grid"></div>
    <div id="session-runner"></div>
  `;
  drawGrid();

  function drawGrid() {
    container.querySelector("#activity-grid").innerHTML = ACTIVITIES.map((a) => `
      <div class="glass-card">
        <div class="icon-wrap" style="color:var(--accent);margin-bottom:0.5rem;">${icon(a.icon, { size: 22 })}</div>
        <h3 style="margin-bottom:0.2rem;">${a.title}</h3>
        <p>${a.desc}</p>
        <button class="gradient-btn" data-start="${a.id}">Start · ${a.minutes} min</button>
      </div>`).join("");
    container.querySelectorAll("[data-start]").forEach((btn) => {
      btn.addEventListener("click", () => startSession(ACTIVITIES.find((a) => a.id === btn.dataset.start)));
    });
  }

  function startSession(activity) {
    stopSession();
    const runner = container.querySelector("#session-runner");
    const totalMs = activity.minutes * 60 * 1000;
    const startedAt = Date.now();

    runner.innerHTML = `
      <div class="glass-card section" style="text-align:center;" id="runner-card">
        <h3>${activity.title}</h3>
        ${activity.breathing ? `<div class="breath-circle" id="breath-circle"><span id="breath-label">Breathe in</span></div>` : `<p style="font-size:1.05rem;color:var(--text-hi);min-height:2.4em;" id="step-label"></p>`}
        <div class="xp-bar" style="margin:0.8rem 0;"><div id="runner-progress" style="width:0%"></div></div>
        <button class="ghost-btn small-btn" id="runner-cancel">Cancel</button>
      </div>`;

    const stepLabel = runner.querySelector("#step-label");
    const progressBar = runner.querySelector("#runner-progress");
    const breathLabel = runner.querySelector("#breath-label");
    const breathCircle = runner.querySelector("#breath-circle");

    const phases = activity.breathing ? ["Breathe in", "Hold", "Breathe out", "Hold"] : activity.steps;
    const phaseMs = activity.breathing ? 4000 : totalMs / phases.length;
    let phaseIndex = -1;

    function tickPhase() {
      phaseIndex = (phaseIndex + 1) % phases.length;
      if (activity.breathing) {
        breathLabel.textContent = phases[phaseIndex];
        // phases: 0 in, 1 hold(expanded), 2 out, 3 hold(contracted)
        breathCircle.classList.toggle("expand", phaseIndex === 0 || phaseIndex === 1);
      } else if (stepLabel) {
        stepLabel.textContent = phases[phaseIndex];
      }
    }
    tickPhase();
    const phaseTimer = setInterval(tickPhase, phaseMs);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      progressBar.style.width = pct + "%";
      if (elapsed >= totalMs) finishSession();
    }, 200);

    activeSession = { phaseTimer, progressTimer };

    runner.querySelector("#runner-cancel").addEventListener("click", () => {
      stopSession();
      runner.innerHTML = "";
    });

    async function finishSession() {
      stopSession();
      await mindfulnessRepo.logSession(activity.id, activity.minutes);
      await grantXpAndCelebrate(15, `${activity.title} session`, 5);
      runner.innerHTML = `<div class="glass-card section" style="text-align:center;"><h3>Nicely done</h3><p>You completed ${activity.title}.</p></div>`;
      const stats = await mindfulnessRepo.today();
      container.querySelector(".screen-title p").textContent = `${stats.length} session${stats.length === 1 ? "" : "s"} completed today`;
    }
  }

  function stopSession() {
    if (!activeSession) return;
    clearInterval(activeSession.phaseTimer);
    clearInterval(activeSession.progressTimer);
    activeSession = null;
  }
}
