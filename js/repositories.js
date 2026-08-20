import { store } from "./store.js";
import { authService } from "./authService.js";
import { supabase, hasSupabase } from "./supabaseClient.js";
import { todayKey, weekKey, monthKey, levelFromTotalXp } from "./utils.js";

function uid() {
  const u = authService.currentUserId();
  if (!u) throw new Error("No signed-in user");
  return u;
}

// ============ PROFILE ============
export const profileRepo = {
  async get() {
    return store.get("profiles", uid());
  },
  async save(patch) {
    const existing = (await store.get("profiles", uid())) || {};
    return store.set("profiles", uid(), { ...existing, ...patch, onboarded: true });
  },
};

// ============ PLAYER (xp/level/coins/streak) ============
export const playerRepo = {
  async ensure() {
    const existing = await store.get("players", uid());
    if (!existing) {
      await store.set("players", uid(), {
        xp: 0, level: 1, coins: 50, totalXp: 0, streak: 0,
        lastActiveDate: null, seasonXp: 0, title: "Novice Bloomer",
        inventory: [], equipped: {},
      });
    }
  },
  async get() {
    await playerRepo.ensure();
    return store.get("players", uid());
  },
  async grantXp(amount, reason = "") {
    const p = await playerRepo.get();
    const totalXp = Math.max(0, p.totalXp + amount);
    const { level, xpIntoLevel, xpForNext } = levelFromTotalXp(totalXp);
    const leveledUp = level > p.level;
    const updated = await store.update("players", uid(), {
      totalXp, xp: xpIntoLevel, level, xpForNext,
      seasonXp: p.seasonXp + Math.max(0, amount),
    });
    await store.add("xpLog", { userId: uid(), amount, reason, date: todayKey(), ts: Date.now() });
    return { player: updated, leveledUp, from: p.level, to: level };
  },
  async addCoins(amount) {
    const p = await playerRepo.get();
    return store.update("players", uid(), { coins: Math.max(0, p.coins + amount) });
  },
  async touchStreak() {
    const p = await playerRepo.get();
    const today = todayKey();
    if (p.lastActiveDate === today) return p;
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    const streak = p.lastActiveDate === yesterday ? p.streak + 1 : 1;
    return store.update("players", uid(), { streak, lastActiveDate: today });
  },
};

// ============ TRACKERS ============
function trackerRepo(collection) {
  return {
    async logToday(patch) {
      const date = todayKey();
      const key = `${uid()}_${date}`;
      const existing = await store.get(collection, key);
      return store.set(collection, key, { ...existing, ...patch, userId: uid(), date });
    },
    async today() {
      return store.get(collection, `${uid()}_${todayKey()}`);
    },
    async history(days = 14) {
      const rows = await store.query(collection, (d) => d.userId === uid());
      return rows.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-days);
    },
  };
}

export const waterRepo = {
  ...trackerRepo("water"),
  async addMl(ml) {
    const cur = (await waterRepo.today())?.ml || 0;
    return waterRepo.logToday({ ml: cur + ml });
  },
};

export const sleepRepo = {
  ...trackerRepo("sleep"),
  async logHours(hours, quality) {
    return sleepRepo.logToday({ hours, quality });
  },
};

export const moodRepo = {
  ...trackerRepo("mood"),
  async logMood(mood, energy, stress, note) {
    return moodRepo.logToday({ mood, energy, stress, note, ts: Date.now() });
  },
};

export const journalRepo = {
  async add(text) {
    return store.add("journal", { userId: uid(), text, date: todayKey(), ts: Date.now() });
  },
  async history(limit = 20) {
    const rows = await store.query("journal", (d) => d.userId === uid());
    return rows.sort((a, b) => b.ts - a.ts).slice(0, limit);
  },
  async remove(id) {
    return store.remove("journal", id);
  },
};

export const gratitudeRepo = {
  async today() {
    return store.get("gratitude", `${uid()}_${todayKey()}`);
  },
  async add(items) {
    const date = todayKey();
    const key = `${uid()}_${date}`;
    const existing = await store.get("gratitude", key);
    const merged = [...(existing?.items || []), ...items];
    return store.set("gratitude", key, { userId: uid(), date, items: merged });
  },
  async history(days = 14) {
    const rows = await store.query("gratitude", (d) => d.userId === uid());
    return rows.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-days);
  },
  async remove(id) {
    return store.remove("gratitude", id);
  },
};

export const mindfulnessRepo = {
  async logSession(activity, minutes) {
    return store.add("mindfulnessSessions", { userId: uid(), activity, minutes, date: todayKey(), ts: Date.now() });
  },
  async today() {
    return store.query("mindfulnessSessions", (d) => d.userId === uid() && d.date === todayKey());
  },
  async history(days = 30) {
    const cutoff = todayKey(new Date(Date.now() - days * 86400000));
    return store.query("mindfulnessSessions", (d) => d.userId === uid() && d.date >= cutoff);
  },
};

export const trustedContactsRepo = {
  async all() {
    return store.query("trustedContacts", (c) => c.userId === uid());
  },
  async add(name, phone, relation) {
    return store.add("trustedContacts", { userId: uid(), name, phone, relation });
  },
  async remove(id) {
    return store.remove("trustedContacts", id);
  },
};

export const focusRepo = {
  async logSession(minutes, completed) {
    return store.add("focusSessions", { userId: uid(), minutes, completed, date: todayKey(), ts: Date.now() });
  },
  async today() {
    return store.query("focusSessions", (d) => d.userId === uid() && d.date === todayKey());
  },
  async history(days = 14) {
    const cutoff = todayKey(new Date(Date.now() - days * 86400000));
    return store.query("focusSessions", (d) => d.userId === uid() && d.date >= cutoff);
  },
};

// ============ QUESTS ============
export const questRepo = {
  async todaysQuests() {
    return store.query("quests", (q) => q.userId === uid() && q.date === todayKey());
  },
  async setQuests(quests) {
    const date = todayKey();
    const existing = await store.query("quests", (q) => q.userId === uid() && q.date === date);
    await Promise.all(existing.map((q) => store.remove("quests", q.id)));
    return Promise.all(quests.map((q) => store.add("quests", { ...q, userId: uid(), date, completed: false })));
  },
  async complete(id) {
    return store.update("quests", id, { completed: true, completedAt: Date.now() });
  },
  async completedTotal() {
    const all = await store.query("quests", (q) => q.userId === uid() && q.completed);
    return all.length;
  },
};

// ============ GOALS ============
export const goalsRepo = {
  async all() {
    return store.query("goals", (g) => g.userId === uid());
  },
  async add(text, target) {
    return store.add("goals", { userId: uid(), text, target, progress: 0, done: false });
  },
  async update(id, patch) {
    return store.update("goals", id, patch);
  },
  async remove(id) {
    return store.remove("goals", id);
  },
};

// ============ STUDY PLANNER ============
export const studyPlannerRepo = {
  async all() {
    const rows = await store.query("studyTasks", (t) => t.userId === uid());
    return rows.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  },
  async add(task) {
    return store.add("studyTasks", { ...task, userId: uid(), done: false });
  },
  async toggle(id) {
    const t = await store.get("studyTasks", id);
    return store.update("studyTasks", id, { done: !t.done });
  },
  async remove(id) {
    return store.remove("studyTasks", id);
  },
  async exams() {
    const all = await studyPlannerRepo.all();
    return all.filter((t) => t.type === "exam");
  },
};

// ============ ACHIEVEMENTS ============
export const achievementsRepo = {
  async unlocked() {
    const rows = await store.query("achievements", (a) => a.userId === uid());
    return rows.map((a) => a.achId);
  },
  async unlock(achId) {
    const key = `${uid()}_${achId}`;
    if (await store.get("achievements", key)) return null;
    return store.set("achievements", key, { userId: uid(), achId, unlockedAt: Date.now() });
  },
};

// ============ BOSS ============
export const bossRepo = {
  async state(bossId, maxHp) {
    const key = `${uid()}_${bossId}_${weekKey()}`;
    let s = await store.get("bossState", key);
    if (!s) s = await store.set("bossState", key, { userId: uid(), bossId, week: weekKey(), hp: maxHp, maxHp, defeated: false, usedToday: {}, usedDate: todayKey() });
    if (s.usedDate !== todayKey()) {
      s = await store.update("bossState", key, { usedToday: {}, usedDate: todayKey() });
    }
    return s;
  },
  // one attack per weakness per day — prevents spam-clicking a weakness to instantly zero the boss
  async attack(bossId, maxHp, weaknessLabel, amount) {
    const s = await bossRepo.state(bossId, maxHp);
    const key = `${uid()}_${bossId}_${weekKey()}`;
    if (s.defeated || s.usedToday[weaknessLabel]) return { ...s, blocked: true };
    const hp = Math.max(0, s.hp - amount);
    const updated = await store.update("bossState", key, { hp, defeated: hp === 0, usedToday: { ...s.usedToday, [weaknessLabel]: true } });
    return { ...updated, blocked: false };
  },
};

// ============ SHOP ============
export const shopRepo = {
  async purchase(itemId, cost) {
    const p = await playerRepo.get();
    if (p.coins < cost) throw new Error("Not enough coins.");
    await playerRepo.addCoins(-cost);
    const inv = new Set(p.inventory || []);
    inv.add(itemId);
    return store.update("players", uid(), { inventory: [...inv] });
  },
  async equip(slot, itemId) {
    const p = await playerRepo.get();
    return store.update("players", uid(), { equipped: { ...p.equipped, [slot]: itemId } });
  },
};

// ============ SOCIAL ============
// With Supabase configured, the leaderboard is real: a SECURITY DEFINER RPC
// (see supabase/schema.sql) exposes name/school/level/xp for every signed-up
// user, since normal RLS scopes each user to their own rows only. Offline
// mode has no other users, so it just shows you.
export const leaderboardRepo = {
  async global(limit = 100) {
    const me = await playerRepo.get();
    const profile = await profileRepo.get();
    if (!hasSupabase) {
      return [{ name: profile?.name || "You", xp: me.totalXp, level: me.level, isMe: true }];
    }
    const { data, error } = await supabase.rpc("leaderboard", { limit_n: limit });
    if (error) throw new Error(error.message);
    const myId = uid();
    return (data || []).map((r) => ({
      userId: r.user_id, name: r.name, school: r.school, level: r.level,
      xp: r.total_xp, streak: r.streak, isMe: r.user_id === myId,
    }));
  },
};

export const friendsRepo = {
  async all() {
    return store.query("friends", (f) => f.userId === uid());
  },
  async add(friendUserId, name) {
    const existing = await store.query("friends", (f) => f.userId === uid() && f.friendUserId === friendUserId);
    if (existing.length) return existing[0];
    return store.add("friends", { userId: uid(), friendUserId, name, addedAt: Date.now() });
  },
  async remove(id) {
    return store.remove("friends", id);
  },
  async cheer(friendUserId, friendName) {
    if (hasSupabase) {
      const { error } = await supabase.rpc("send_cheer", {
        target_user_id: friendUserId,
        message: "A friend cheered you on MindBloom! 🎉",
      });
      if (error) throw new Error(error.message);
    } else {
      await notificationsRepo.add(`You cheered ${friendName}.`);
    }
  },
};

// ============ NOTIFICATIONS ============
export const notificationsRepo = {
  async add(message) {
    const dup = await store.query("notifications", (n) => n.userId === uid() && n.message === message && Date.now() - n.ts < 12 * 3600 * 1000);
    if (dup.length) return dup[0];
    return store.add("notifications", { userId: uid(), message, read: false, ts: Date.now() });
  },
  async all() {
    const rows = await store.query("notifications", (n) => n.userId === uid());
    return rows.sort((a, b) => b.ts - a.ts);
  },
  async markAllRead() {
    const all = await notificationsRepo.all();
    await Promise.all(all.map((n) => store.update("notifications", n.id, { read: true })));
  },
  async unreadCount() {
    const all = await notificationsRepo.all();
    return all.filter((n) => !n.read).length;
  },
};

// ============ AI COACH MEMORY ============
export const coachRepo = {
  async history() {
    const rows = await store.query("coachChat", (c) => c.userId === uid());
    return rows.sort((a, b) => a.ts - b.ts);
  },
  async add(role, text) {
    return store.add("coachChat", { userId: uid(), role, text, ts: Date.now() });
  },
  async clear() {
    const rows = await store.query("coachChat", (c) => c.userId === uid());
    await Promise.all(rows.map((r) => store.remove("coachChat", r.id)));
  },
};

// ============ WEEKLY REPORTS ============
export const reportsRepo = {
  async save(report) {
    return store.set("reports", `${uid()}_${report.week}`, { ...report, userId: uid() });
  },
  async get(week = weekKey()) {
    return store.get("reports", `${uid()}_${week}`);
  },
  async all() {
    const rows = await store.query("reports", (r) => r.userId === uid());
    return rows.sort((a, b) => b.week.localeCompare(a.week));
  },
};

// ============ SEASON ============
export const seasonRepo = {
  current() {
    return monthKey();
  },
};

// ============ WEEKLY CHALLENGES ============
// Progress is derived from real tracker data (not self-reported), scoped to the
// current ISO week. Claiming a completed challenge is recorded once per user
// per week so the reward can't be collected twice.
const CHALLENGE_DEFS = {
  hydration_week: { target: 5, reward: { xp: 40, coins: 20 } },
  focus_marathon: { target: 10, reward: { xp: 60, coins: 30 } },
  mood_streak: { target: 7, reward: { xp: 50, coins: 25 } },
};

export const challengesRepo = {
  async progress() {
    const week = weekKey();
    const inWeek = (dateStr) => dateStr && weekKey(new Date(dateStr)) === week;

    const waterDays = new Set((await waterRepo.history(14)).filter((d) => inWeek(d.date) && d.ml > 0).map((d) => d.date)).size;
    const focusSessions = (await focusRepo.history(14)).filter((d) => inWeek(d.date) && d.completed).length;
    const moodDays = new Set((await moodRepo.history(14)).filter((d) => inWeek(d.date)).map((d) => d.date)).size;

    const claims = await store.query("challengeClaims", (c) => c.userId === uid() && c.week === week);
    const claimedIds = new Set(claims.map((c) => c.challengeId));

    return {
      hydration_week: { progress: waterDays, target: CHALLENGE_DEFS.hydration_week.target, claimed: claimedIds.has("hydration_week") },
      focus_marathon: { progress: focusSessions, target: CHALLENGE_DEFS.focus_marathon.target, claimed: claimedIds.has("focus_marathon") },
      mood_streak: { progress: moodDays, target: CHALLENGE_DEFS.mood_streak.target, claimed: claimedIds.has("mood_streak") },
    };
  },
  async claim(challengeId) {
    const def = CHALLENGE_DEFS[challengeId];
    if (!def) throw new Error("Unknown challenge.");
    const week = weekKey();
    const key = `${uid()}_${week}_${challengeId}`;
    if (await store.get("challengeClaims", key)) throw new Error("Already claimed this week.");
    const p = await challengesRepo.progress();
    if (p[challengeId].progress < def.target) throw new Error("Not complete yet.");
    await store.set("challengeClaims", key, { userId: uid(), week, challengeId, claimedAt: Date.now() });
    return def.reward;
  },
};
