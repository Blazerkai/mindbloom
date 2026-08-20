import { el } from "./utils.js";
import { icon } from "./icons.js";

const layer = () => document.getElementById("fx-layer");

const TOAST_ICONS = { info: "sparkles", success: "checkCircle", xp: "sparkles", coin: "coins", achievement: "award", error: "alertTriangle" };

export function toast(message, kind = "info") {
  const node = el(`<div class="toast">${icon(TOAST_ICONS[kind] || "sparkles", { size: 16 })} <span>${message}</span></div>`);
  layer().appendChild(node);
  if (window.gsap) {
    window.gsap.fromTo(node, { x: 30, opacity: 0, scale: 0.9 }, { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" });
    window.gsap.to(node, { opacity: 0, x: 20, duration: 0.3, delay: 3.1, onComplete: () => node.remove() });
  } else {
    setTimeout(() => node.remove(), 3400);
  }
}

export function confettiBurst(count = 36) {
  const colors = ["#6366f1", "#10b981", "#d97706", "#f5c518", "#ec4899"];
  for (let i = 0; i < count; i++) {
    const piece = el(`<div class="confetti-piece"></div>`);
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    layer().appendChild(piece);
    if (window.gsap) {
      window.gsap.fromTo(piece,
        { y: -10, x: 0, rotation: Math.random() * 360, opacity: 1 },
        {
          y: window.innerHeight + 40,
          x: (Math.random() - 0.5) * 200,
          rotation: `+=${360 + Math.random() * 360}`,
          opacity: 0,
          duration: 1.4 + Math.random() * 1.2,
          ease: "power1.in",
          onComplete: () => piece.remove(),
        });
    } else {
      piece.style.animationDuration = 1.4 + Math.random() * 1.2 + "s";
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      setTimeout(() => piece.remove(), 2800);
    }
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
  confettiBurst(60);
  if (window.gsap) {
    window.gsap.fromTo(node.querySelector(".levelup-card"),
      { scale: 0.6, opacity: 0, rotation: -6 },
      { scale: 1, opacity: 1, rotation: 0, duration: 0.5, ease: "back.out(1.9)" });
    window.gsap.fromTo(node.querySelector(".levelup-icon-wrap"),
      { scale: 0 }, { scale: 1, duration: 0.6, delay: 0.15, ease: "elastic.out(1, 0.4)" });
  }
  node.querySelector("#levelup-close").addEventListener("click", () => node.remove());
  setTimeout(() => node.remove(), 5000);
}

export function achievementUnlockToast(achievement) {
  toast(`Achievement unlocked: <strong>${achievement.title}</strong>`, "achievement");
}

export function celebrateGrant({ leveledUp, from, to }) {
  if (leveledUp) levelUpOverlay(from, to);
}
