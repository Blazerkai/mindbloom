import { friendsRepo, leaderboardRepo, playerRepo, challengesRepo } from "../repositories.js";
import { hasSupabase } from "../supabaseClient.js";
import { toast } from "../fx.js";
import { icon } from "../icons.js";
import { grantXpAndCelebrate } from "./_actions.js";

const WEEKLY_CHALLENGES = [
  { id: "hydration_week", icon: "droplet", title: "Hydration Week", desc: "Log water 5 days this week" },
  { id: "focus_marathon", icon: "target", title: "Focus Marathon", desc: "Complete 10 Pomodoro sessions" },
  { id: "mood_streak", icon: "pulse", title: "Mood Streak", desc: "Check in daily for 7 days" },
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
    body.innerHTML = `<div class="list" id="lb-list">${skeletonRows()}</div>`;
    const rows = await leaderboardRepo.global();
    body.querySelector("#lb-list").innerHTML = rows.length
      ? rows.map((r, i) => `
        <div class="list-item rank-item ${r.isMe ? "rank-me" : ""} ${i === 0 ? "rank-gold" : i === 1 ? "rank-silver" : i === 2 ? "rank-bronze" : ""}">
          <span class="icon-wrap" style="min-width:1.8rem;font-weight:700;color:var(--text-hi);">#${i + 1}</span>
          <div class="main"><div class="title">${escapeHtml(r.name)}${r.isMe ? " (You)" : ""}</div>${r.school ? `<div class="sub">${escapeHtml(r.school)} · Lv ${r.level}</div>` : `<div class="sub">Lv ${r.level}</div>`}</div>
          <span class="pill gold">${r.xp} XP</span>
        </div>`).join("")
      : `<p class="muted">No one's on the board yet — you're the first Bloomer here.</p>`;
    if (window.gsap && rows.length) {
      window.gsap.from("#lb-list .list-item", { opacity: 0, x: -16, stagger: 0.04, duration: 0.4, ease: "power2.out" });
    }
  }

  async function drawFriends(body) {
    body.innerHTML = `
      ${hasSupabase ? `
      <div class="glass-card section">
        <h3>Find people</h3>
        <input id="friend-search" placeholder="Search by name…" />
        <div class="list" id="search-results"></div>
      </div>` : `<p class="muted section">Friend search needs Supabase to be connected.</p>`}
      <h3>Your friends</h3>
      <div class="list" id="friends-list"></div>`;

    let board = [];
    if (hasSupabase) {
      board = await leaderboardRepo.global(200);
      const searchInput = body.querySelector("#friend-search");
      const resultsEl = body.querySelector("#search-results");
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        const friends = new Set();
        const matches = q
          ? board.filter((r) => !r.isMe && r.name.toLowerCase().includes(q)).slice(0, 8)
          : [];
        resultsEl.innerHTML = matches.length
          ? matches.map((r) => `
            <div class="list-item">
              <span class="icon-wrap">${icon("user", { size: 17 })}</span>
              <div class="main"><div class="title">${escapeHtml(r.name)}</div><div class="sub">${r.school ? escapeHtml(r.school) + " · " : ""}Lv ${r.level}</div></div>
              <button class="ghost-btn small-btn" data-add="${r.userId}" data-name="${escapeHtml(r.name)}">Add</button>
            </div>`).join("")
          : q ? `<p class="muted">No matches.</p>` : "";
        resultsEl.querySelectorAll("[data-add]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            await friendsRepo.add(btn.dataset.add, btn.dataset.name);
            toast(`Added ${btn.dataset.name} as a friend`, "success");
            await renderList();
          });
        });
      });
    }

    async function renderList() {
      const friends = await friendsRepo.all();
      const byId = new Map(board.map((r) => [r.userId, r]));
      body.querySelector("#friends-list").innerHTML = friends.length
        ? friends.map((f) => {
            const live = byId.get(f.friendUserId);
            return `<div class="list-item">
              <span class="icon-wrap">${icon("user", { size: 17 })}</span>
              <div class="main"><div class="title">${escapeHtml(f.name)}</div>${live ? `<div class="sub">Lv ${live.level} · ${live.xp} XP</div>` : ""}</div>
              <div style="display:flex;gap:0.4rem;">
                <button class="ghost-btn small-btn" data-cheer="${f.friendUserId}" data-name="${escapeHtml(f.name)}">Cheer</button>
                <button class="icon-btn" data-remove="${f.id}">${icon("x", { size: 14 })}</button>
              </div>
            </div>`;
          }).join("")
        : `<p class="muted">No friends yet — search for someone above.</p>`;
      body.querySelectorAll("[data-cheer]").forEach((btn) => btn.addEventListener("click", async () => {
        await friendsRepo.cheer(btn.dataset.cheer, btn.dataset.name);
        toast(`Cheered ${btn.dataset.name}`, "success");
      }));
      body.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", async () => {
        await friendsRepo.remove(btn.dataset.remove);
        await renderList();
      }));
    }
    await renderList();
  }

  async function drawChallenges(body) {
    body.innerHTML = `<div class="grid cols-3" id="challenges-grid">${WEEKLY_CHALLENGES.map(() => `<div class="skel" style="height:150px;border-radius:10px;"></div>`).join("")}</div>`;
    const progress = await challengesRepo.progress();
    body.querySelector("#challenges-grid").innerHTML = WEEKLY_CHALLENGES.map((c) => {
      const p = progress[c.id];
      const pct = Math.min(100, Math.round((p.progress / p.target) * 100));
      const complete = p.progress >= p.target;
      return `
        <div class="glass-card" style="text-align:center;">
          <div class="icon-wrap" style="color:var(--accent);margin-bottom:0.4rem;">${icon(c.icon, { size: 22 })}</div>
          <div style="font-weight:600;color:var(--text-hi);">${c.title}</div>
          <p class="muted">${c.desc}</p>
          <div class="xp-bar" style="margin:0.6rem 0;"><div style="width:${pct}%"></div></div>
          <p class="muted">${p.progress}/${p.target}</p>
          <button class="${p.claimed ? "ghost-btn" : "gradient-btn"} small-btn" data-claim="${c.id}" ${p.claimed || !complete ? "disabled" : ""} style="width:100%;margin-top:0.4rem;">
            ${p.claimed ? "Claimed" : complete ? "Claim reward" : "In progress"}
          </button>
        </div>`;
    }).join("");
    body.querySelectorAll("[data-claim]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          const reward = await challengesRepo.claim(btn.dataset.claim);
          await grantXpAndCelebrate(reward.xp, "weekly challenge", reward.coins);
          await drawChallenges(body);
        } catch (e) {
          toast(e.message, "info");
        }
      });
    });
  }
}

function skeletonRows() {
  return Array.from({ length: 4 }).map(() => `<div class="skel" style="height:52px;border-radius:10px;"></div>`).join("");
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
