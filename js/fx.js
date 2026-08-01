import { el } from "./utils.js";
import { icon } from "./icons.js";

const layer = () => document.getElementById("fx-layer");

const TOAST_ICONS = { info: "sparkles", success: "checkCircle", xp: "sparkles", coin: "coins", achievement: "award" };

export function toast(message, kind = "info") {
  const node = el(`<div class="toast">${icon(TOAST_ICONS[kind] || "sparkles", { size: 16 })} <span>${message}</span></div>`);
  layer().appendChild(node);
  setTimeout(() => node.remove(), 3400);
}

export function confettiBurst(count = 36) {
  const colors = ["#6366f1", "#10b981", "#d97706", "#9498a8"];
  for (let i = 0; i < count; i++) {
    const piece = el(`<div class="confetti-piece"></div>`);
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer().appendChild(piece);
    setTimeout(() => piece.remove(), 2800);
  }
}

export function levelUpOverlay(fromLevel, toLevel) {
  const node = el(`
    <div class="levelup-overlay">
      <div class="levelup-card glass-card">
        <div class="levelup-icon-wrap">${icon("trendingUp", { size: 28 })}</div>
        <h2>Level up</h2>
        <p style="font-size:1.05rem;color:var(--text-hi);">Level ${fromLevel} → <strong>${toLevel}</strong></p>
        <button class="gradient-btn" id="levelup-close">Continue</button>
      </div>
    </div>
  `);
  layer().appendChild(node);
  confettiBurst(50);
  node.querySelector("#levelup-close").addEventListener("click", () => node.remove());
  setTimeout(() => node.remove(), 5000);
}

export function achievementUnlockToast(achievement) {
  toast(`Achievement unlocked: <strong>${achievement.title}</strong>`, "achievement");
}

export function celebrateGrant({ leveledUp, from, to }) {
  if (leveledUp) levelUpOverlay(from, to);
}
