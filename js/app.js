import { gsap } from "./vendor/gsap/index.js";
window.gsap = gsap;

import { authService } from "./authService.js";
import { profileRepo, playerRepo } from "./repositories.js";
import { renderAuthGate, renderProfileSetup } from "./screens/auth.js";
import { evaluateAchievements } from "./achievements.js";
import { achievementUnlockToast, toast } from "./fx.js";
import { icon } from "./icons.js";

window.addEventListener("unhandledrejection", (ev) => {
  console.error(ev.reason);
  toast(ev.reason?.message === "No signed-in user" ? "Signed out — please log back in." : "Something went wrong. Please try again.", "error");
  ev.preventDefault();
});

import * as dashboard from "./screens/dashboard.js";
import * as coach from "./screens/coach.js";
import * as trackers from "./screens/trackers.js";
import * as journal from "./screens/journal.js";
import * as mindfulness from "./screens/mindfulness.js";
import * as goals from "./screens/goals.js";
import * as pomodoro from "./screens/pomodoro.js";
import * as character from "./screens/character.js";
import * as shop from "./screens/shop.js";
import * as planner from "./screens/planner.js";
import * as social from "./screens/social.js";
import * as settingsScreen from "./screens/settings.js";
import * as sos from "./screens/sos.js";

const ROUTES = [
  { path: "/", icon: "home", label: "Home", mod: dashboard },
  { path: "/coach", icon: "cpu", label: "AI Coach", mod: coach },
  { path: "/trackers", icon: "barChart", label: "Trackers", mod: trackers },
  { path: "/journal", icon: "bookOpen", label: "Journal & Gratitude", mod: journal },
  { path: "/mindfulness", icon: "wind", label: "Calm & Mindfulness", mod: mindfulness },
  { path: "/goals", icon: "compass", label: "Goals & Motivation", mod: goals },
  { path: "/planner", icon: "fileText", label: "Study Planner", mod: planner },
  { path: "/pomodoro", icon: "target", label: "Focus Timer", mod: pomodoro },
  { path: "/character", icon: "user", label: "Character", mod: character },
  { path: "/shop", icon: "shoppingBag", label: "Shop", mod: shop },
  { path: "/social", icon: "users", label: "Leaderboard", mod: social },
  { path: "/sos", icon: "alertTriangle", label: "Emergency Help", mod: sos },
  { path: "/settings", icon: "settings", label: "Settings", mod: settingsScreen },
];

const BOTTOMNAV_PATHS = ["/", "/trackers", "/coach", "/social", "/settings"];

function buildNav() {
  const sidenav = document.getElementById("sidenav");
  const bottomnav = document.getElementById("bottomnav");
  sidenav.innerHTML = ROUTES.map((r) => `<a href="#${r.path}" data-path="${r.path}">${icon(r.icon, { size: 16 })}<span>${r.label}</span></a>`).join("");
  bottomnav.innerHTML = ROUTES.filter((r) => BOTTOMNAV_PATHS.includes(r.path))
    .map((r) => `<a href="#${r.path}" data-path="${r.path}">${icon(r.icon, { size: 18 })}<span>${r.label}</span></a>`).join("");
}

function currentPath() {
  const hash = location.hash.replace(/^#/, "");
  return hash || "/";
}

let onboardingInProgress = false;

async function router() {
  if (!authService.currentUserId() || onboardingInProgress) {
    return;
  }
  const path = currentPath();
  const route = ROUTES.find((r) => r.path === path) || ROUTES[0];
  document.querySelectorAll(".sidenav a, .bottomnav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.path === route.path);
  });
  const view = document.getElementById("view");
  const pane = document.createElement("div");
  view.innerHTML = "";
  view.appendChild(pane);
  if (route.mod === settingsScreen) {
    await route.mod.render(pane, showAuthGate);
  } else {
    await route.mod.render(pane);
  }
  // A later navigation may have already replaced this pane while the awaits above
  // were in flight — skip animating/celebrating a screen the user has left.
  if (!pane.isConnected) return;
  if (window.gsap) {
    window.gsap.fromTo(pane, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
  }
  const newly = await evaluateAchievements();
  newly.forEach((a) => achievementUnlockToast(a));
}

let lastKnownStats = null;

export async function refreshTopbar() {
  const player = await playerRepo.get();
  const bar = document.getElementById("topbar-stats");
  const changed = lastKnownStats && (lastKnownStats.coins !== player.coins || lastKnownStats.level !== player.level || lastKnownStats.streak !== player.streak);
  bar.innerHTML = `
    <span class="pill" data-stat="level">${icon("star", { size: 13 })} Lv ${player.level}</span>
    <span class="pill gold" data-stat="coins">${icon("coins", { size: 13 })} ${player.coins}</span>
    <span class="pill" data-stat="streak">${icon("flame", { size: 13 })} ${player.streak}d</span>
  `;
  if (changed && window.gsap) {
    const targets = [];
    if (lastKnownStats.coins !== player.coins) targets.push(bar.querySelector('[data-stat="coins"]'));
    if (lastKnownStats.level !== player.level) targets.push(bar.querySelector('[data-stat="level"]'));
    if (lastKnownStats.streak !== player.streak) targets.push(bar.querySelector('[data-stat="streak"]'));
    window.gsap.fromTo(targets, { scale: 1.35 }, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.45)" });
  }
  lastKnownStats = { coins: player.coins, level: player.level, streak: player.streak };
}

async function showApp() {
  onboardingInProgress = false;
  document.getElementById("auth-gate").classList.add("hidden");
  document.getElementById("shell").classList.remove("hidden");
  buildNav();
  await refreshTopbar();
  await playerRepo.touchStreak();
  router();
}

function showAuthGate() {
  onboardingInProgress = false;
  document.getElementById("shell").classList.add("hidden");
  document.getElementById("auth-gate").classList.remove("hidden");
  renderAuthGate(onSignedIn);
}

async function onSignedIn() {
  const profile = await profileRepo.get();
  if (!profile?.onboarded) {
    onboardingInProgress = true;
    document.getElementById("auth-gate").classList.add("hidden");
    document.getElementById("shell").classList.remove("hidden");
    const view = document.getElementById("view");
    document.getElementById("sidenav").innerHTML = "";
    document.getElementById("bottomnav").innerHTML = "";
    document.getElementById("topbar-stats").innerHTML = "";
    renderProfileSetup(view, showApp);
  } else {
    showApp();
  }
}

document.getElementById("btn-signout").addEventListener("click", async () => {
  await authService.signOut();
  showAuthGate();
});

window.addEventListener("hashchange", router);

// -------- bootstrap --------
const initialUserId = await authService.ready();
if (initialUserId) {
  onSignedIn();
} else {
  showAuthGate();
}
