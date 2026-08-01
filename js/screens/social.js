import { friendsRepo, leaderboardRepo, playerRepo } from "../repositories.js";
import { toast } from "../fx.js";
import { icon } from "../icons.js";

const WEEKLY_CHALLENGES = [
  { icon: "droplet", title: "Hydration Week", desc: "Log water 5 days this week" },
  { icon: "target", title: "Focus Marathon", desc: "Complete 10 Pomodoro sessions" },
  { icon: "pulse", title: "Mood Streak", desc: "Check in daily for 7 days" },
];

let tab = "leaderboard";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Social</h2><p class="muted">Friends, leaderboards, and weekly challenges</p></div>
    <div class="auth-tabs section" id="social-tabs">
      <button data-tab="leaderboard">Leaderboard</button>
      <button data-tab="friends">Friends</button>
      <button data-tab="challenges">Challenges</button>
    </div>
    <div id="social-body"></div>
  `;

  container.querySelectorAll("#social-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => { tab = btn.dataset.tab; drawTabs(); drawBody(); });
  });
  drawTabs(); drawBody();

  function drawTabs() {
    container.querySelectorAll("#social-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  }

  async function drawBody() {
    const body = container.querySelector("#social-body");
    if (tab === "leaderboard") return drawLeaderboard(body);
    if (tab === "friends") return drawFriends(body);
    drawChallenges(body);
  }

  async function drawLeaderboard(body) {
    const rows = await leaderboardRepo.global();
    body.innerHTML = `<div class="list">${rows.map((r, i) => `
      <div class="list-item" style="${r.isMe ? "border-color:var(--accent);" : ""}">
        <span class="icon-wrap" style="min-width:1.6rem;font-weight:700;color:var(--text-hi);">#${i + 1}</span>
        <div class="main"><div class="title">${r.name}${r.isMe ? " (You)" : ""}</div>${r.school ? `<div class="sub">${r.school}</div>` : ""}</div>
        <span class="pill gold">${r.xp} XP</span>
      </div>`).join("")}</div>`;
  }

  async function drawFriends(body) {
    body.innerHTML = `
      <div class="glass-card section"><input id="friend-name" placeholder="Friend's username" /><button id="friend-add" class="gradient-btn">Add friend</button></div>
      <div class="list" id="friends-list"></div>`;
    async function renderList() {
      const friends = await friendsRepo.all();
      body.querySelector("#friends-list").innerHTML = friends.length
        ? friends.map((f) => `<div class="list-item"><span class="icon-wrap">${icon("user", { size: 17 })}</span><div class="main"><div class="title">${f.name}</div></div><button class="ghost-btn small-btn" data-cheer="${f.name}">Cheer</button></div>`).join("")
        : `<p class="muted">No friends yet — add one above.</p>`;
      body.querySelectorAll("[data-cheer]").forEach((btn) => btn.addEventListener("click", async () => { await friendsRepo.cheer(btn.dataset.cheer); toast(`Cheered ${btn.dataset.cheer}`, "success"); }));
    }
    body.querySelector("#friend-add").addEventListener("click", async () => {
      const name = body.querySelector("#friend-name").value.trim();
      if (!name) return;
      await friendsRepo.add(name);
      body.querySelector("#friend-name").value = "";
      renderList();
    });
    await renderList();
  }

  function drawChallenges(body) {
    body.innerHTML = `<div class="grid cols-3">${WEEKLY_CHALLENGES.map((c) => `
      <div class="glass-card" style="text-align:center;"><div class="icon-wrap" style="color:var(--accent);margin-bottom:0.4rem;">${icon(c.icon, { size: 22 })}</div><div style="font-weight:600;color:var(--text-hi);">${c.title}</div><p class="muted">${c.desc}</p></div>
    `).join("")}</div>`;
  }
}
