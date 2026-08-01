import { focusRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { toast } from "../fx.js";
import { aiBanner } from "../components.js";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

// module-level so the countdown survives screen navigation; intervalId is
// always cleared and rebound to fresh DOM on each render to avoid double-ticking.
const timer = { seconds: FOCUS_MIN * 60, running: false, mode: "focus", intervalId: null };

export async function render(container) {
  clearInterval(timer.intervalId);

  const todaySessions = await focusRepo.today();
  const sessionsToday = todaySessions.filter((s) => s.completed).length;

  container.innerHTML = `
    <div class="screen-title"><h2>Smart Pomodoro</h2><p class="muted">AI-aware focus timer</p></div>
    <div class="glass-card" style="text-align:center;">
      <div class="pill" id="pomo-mode">${timer.mode === "focus" ? "Focus session" : "Break"}</div>
      <div style="font-size:3.2rem;font-weight:700;margin:0.6rem 0;color:var(--text-hi);" id="pomo-clock">${formatClock(timer.seconds)}</div>
      <div style="display:flex;gap:0.6rem;justify-content:center;">
        <button id="pomo-toggle" class="gradient-btn">${timer.running ? "Pause" : "Start"}</button>
        <button id="pomo-reset" class="ghost-btn">Reset</button>
      </div>
      <p class="muted" style="margin-top:0.8rem;">Sessions completed today: <span id="pomo-count">${sessionsToday}</span></p>
    </div>
    <div class="section" id="pomo-tip">${aiBanner("AI tip", tipFor(sessionsToday))}</div>
  `;

  const clock = container.querySelector("#pomo-clock");
  const modeEl = container.querySelector("#pomo-mode");
  const toggleBtn = container.querySelector("#pomo-toggle");
  let sessions = sessionsToday;

  toggleBtn.addEventListener("click", () => {
    timer.running = !timer.running;
    toggleBtn.textContent = timer.running ? "Pause" : "Start";
    if (timer.running) tick(); else clearInterval(timer.intervalId);
  });

  container.querySelector("#pomo-reset").addEventListener("click", () => {
    clearInterval(timer.intervalId);
    timer.running = false;
    timer.mode = "focus";
    timer.seconds = FOCUS_MIN * 60;
    clock.textContent = formatClock(timer.seconds);
    modeEl.textContent = "Focus session";
    toggleBtn.textContent = "Start";
  });

  if (timer.running) tick();

  function tick() {
    clearInterval(timer.intervalId);
    timer.intervalId = setInterval(async () => {
      timer.seconds -= 1;
      if (timer.seconds <= 0) {
        await completePhase();
        return;
      }
      clock.textContent = formatClock(timer.seconds);
    }, 1000);
  }

  async function completePhase() {
    clearInterval(timer.intervalId);
    if (timer.mode === "focus") {
      await focusRepo.logSession(FOCUS_MIN, true);
      await grantXpAndCelebrate(25, "pomodoro session", 5);
      sessions += 1;
      toast("Focus session complete — time for a break", "success");
      timer.mode = "break";
      timer.seconds = BREAK_MIN * 60;
      const tipEl = container.querySelector("#pomo-tip");
      if (tipEl) tipEl.innerHTML = aiBanner("AI tip", tipFor(sessions));
      const countEl = container.querySelector("#pomo-count");
      if (countEl) countEl.textContent = sessions;
    } else {
      timer.mode = "focus";
      timer.seconds = FOCUS_MIN * 60;
    }
    modeEl.textContent = timer.mode === "focus" ? "Focus session" : "Break";
    clock.textContent = formatClock(timer.seconds);
    timer.running = false;
    toggleBtn.textContent = "Start";
  }
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function tipFor(sessionsToday) {
  if (sessionsToday === 0) return "Start with one focus session — 25 minutes, no phone nearby.";
  if (sessionsToday >= 4) return "That's a long focus streak today — consider a proper 15-minute break with water and a walk.";
  if (sessionsToday >= 2) return "Good pace. Try a short breathing exercise before your next session to reset attention.";
  return "Nice work. A glass of water now can help sustain focus for the next session.";
}
