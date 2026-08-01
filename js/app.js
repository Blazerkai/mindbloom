import { authService } from "./authService.js";
import { profileRepo, playerRepo } from "./repositories.js";
import { renderAuthGate, renderProfileSetup } from "./screens/auth.js";
import { evaluateAchievements } from "./achievements.js";
import { achievementUnlockToast } from "./fx.js";
import { icon } from "./icons.js";

import * as dashboard from "./screens/dashboard.js";
import * as coach from "./screens/coach.js";
import * as burnout from "./screens/burnout.js";
import * as futureYou from "./screens/futureYou.js";
import * as quests from "./screens/quests.js";
import * as trackers from "./screens/trackers.js";
import * as journal from "./screens/journal.js";
import * as pomodoro from "./screens/pomodoro.js";
import * as lifescore from "./screens/lifescore.js";
import * as report from "./screens/report.js";
import * as character from "./screens/character.js";
import * as shop from "./screens/shop.js";
import * as seasons from "./screens/seasons.js";
import * as achievementsScreen from "./screens/achievementsScreen.js";
import * as boss from "./screens/boss.js";
import * as planner from "./screens/planner.js";
import * as social from "./screens/social.js";
import * as notifications from "./screens/notifications.js";
import * as settingsScreen from "./screens/settings.js";

const ROUTES = [
  { path: "/", icon: "home", label: "Home", mod: dashboard },
  { path: "/coach", icon: "cpu", label: "AI Coach", mod: coach },
  { path: "/burnout", icon: "flame", label: "Burnout", mod: burnout },
  { path: "/future-you", icon: "trendingUp", label: "Future You", mod: futureYou },
  { path: "/quests", icon: "target", label: "Quests", mod: quests },
  { path: "/trackers", icon: "barChart", label: "Trackers", mod: trackers },
  { path: "/journal", icon: "bookOpen", label: "Journal", mod: journal },
  { path: "/pomodoro", icon: "target", label: "Focus", mod: pomodoro },
  { path: "/lifescore", icon: "star", label: "Life Score", mod: lifescore },
  { path: "/report", icon: "calendar", label: "Weekly Report", mod: report },
  { path: "/boss", icon: "shield", label: "Boss Battle", mod: boss },
  { path: "/planner", icon: "fileText", label: "Study Planner", mod: planner },
  { path: "/character", icon: "user", label: "Character", mod: character },
  { path: "/shop", icon: "shoppingBag", label: "Shop", mod: shop },
  { path: "/seasons", icon: "calendar", label: "Season", mod: seasons },
  { path: "/achievements", icon: "award", label: "Achievements", mod: achievementsScreen },
  { path: "/social", icon: "users", label: "Social", mod: social },
  { path: "/notifications", icon: "bell", label: "Notifications", mod: notifications },
  { path: "/settings", icon: "settings", label: "Settings", mod: settingsScreen },
];

const BOTTOMNAV_PATHS = ["/", "/quests", "/coach", "/trackers", "/settings"];

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
  view.innerHTML = "";
  if (route.mod === settingsScreen) {
    await route.mod.render(view, showAuthGate);
  } else {
    await route.mod.render(view);
  }
  const newly = await evaluateAchievements();
  newly.forEach((a) => achievementUnlockToast(a));
}

export async function refreshTopbar() {
  const player = await playerRepo.get();
  document.getElementById("topbar-stats").innerHTML = `
    <span class="pill">${icon("star", { size: 13 })} Lv ${player.level}</span>
    <span class="pill gold">${icon("coins", { size: 13 })} ${player.coins}</span>
    <span class="pill">${icon("flame", { size: 13 })} ${player.streak}d</span>
  `;
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
