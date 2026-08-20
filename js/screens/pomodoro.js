import { focusRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { toast } from "../fx.js";
import { aiBanner } from "../components.js";

const BREAK_MIN = 5;

// module-level so the countdown (and the user's chosen focus length) survive
// screen navigation; intervalId is always cleared and rebound to fresh DOM on
// each render to avoid double-ticking.
const timer = { focusMin: 25, seconds: 25 * 60, running: false, mode: "focus", intervalId: null };

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
      <div style="display:flex;gap:0.5rem;align-items:center;justify-content:center;margin-top:0.9rem;">
        <label for="pomo-focus-min" class="muted" style="margin:0;">Focus length</label>
        <input id="pomo-focus-min" type="number" min="1" max="180" value="${timer.focusMin}" ${timer.running ? "disabled" : ""} style="width:70px;margin:0;text-align:center;" aria-label="Focus length in minutes" /> min
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
    container.querySelector("#pomo-focus-min").disabled = timer.running;
    if (timer.running) tick(); else clearInterval(timer.intervalId);
  });

  container.querySelector("#pomo-reset").addEventListener("click", () => {
    clearInterval(timer.intervalId);
    timer.running = false;
    timer.mode = "focus";
    timer.seconds = timer.focusMin * 60;
    clock.textContent = formatClock(timer.seconds);
    modeEl.textContent = "Focus session";
    toggleBtn.textContent = "Start";
  });

  container.querySelector("#pomo-focus-min").addEventListener("change", (e) => {
    const mins = clampMinutes(e.target.value);
    e.target.value = mins;
    timer.focusMin = mins;
    if (!timer.running && timer.mode === "focus") {
      timer.seconds = mins * 60;
      clock.textContent = formatClock(timer.seconds);
    }
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
      await focusRepo.logSession(timer.focusMin, true);
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
      timer.seconds = timer.focusMin * 60;
    }
    modeEl.textContent = timer.mode === "focus" ? "Focus session" : "Break";
    clock.textContent = formatClock(timer.seconds);
    timer.running = false;
    toggleBtn.textContent = "Start";
    const focusInput = container.querySelector("#pomo-focus-min");
    if (focusInput) focusInput.disabled = false;
  }
}

function clampMinutes(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 25;
  return Math.min(180, Math.max(1, n));
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function tipFor(sessionsToday) {
  if (sessionsToday === 0) return `Start with one focus session — ${timer.focusMin} minutes, no phone nearby.`;
  if (sessionsToday >= 4) return "That's a long focus streak today — consider a proper 15-minute break with water and a walk.";
  if (sessionsToday >= 2) return "Good pace. Try a short breathing exercise before your next session to reset attention.";
  return "Nice work. A glass of water now can help sustain focus for the next session.";
}
