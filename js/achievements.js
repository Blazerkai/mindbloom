import { playerRepo, waterRepo, sleepRepo, moodRepo, focusRepo, questRepo, achievementsRepo } from "./repositories.js";

// ---- catalog: generated tiers for each habit + hand-authored specials ----
const HABITS = [
  { key: "water", icon: "droplet", label: "Hydration" },
  { key: "sleep", icon: "moon", label: "Sleep" },
  { key: "mood", icon: "pulse", label: "Mood Check-ins" },
  { key: "focus", icon: "target", label: "Focus Sessions" },
  { key: "quest", icon: "shield", label: "Quests" },
];
const STREAK_TIERS = [3, 7, 14, 30, 60, 100];
const TIER_NAMES = ["common", "common", "rare", "epic", "epic", "legendary"];

function buildCatalog() {
  const list = [];
  for (const habit of HABITS) {
    STREAK_TIERS.forEach((n, i) => {
      list.push({
        id: `${habit.key}_streak_${n}`,
        icon: habit.icon,
        title: `${habit.label} Streak x${n}`,
        desc: `Log ${habit.label.toLowerCase()} ${n} days in a row`,
        tier: TIER_NAMES[i],
        category: habit.key,
      });
    });
  }

  const levelTiers = [5, 10, 15, 20, 30, 40, 50, 75, 100];
  levelTiers.forEach((lv) => {
    list.push({
      id: `level_${lv}`,
      icon: "star",
      title: `Reach Level ${lv}`,
      desc: `Grow your character to level ${lv}`,
      tier: lv >= 75 ? "legendary" : lv >= 40 ? "epic" : lv >= 15 ? "rare" : "common",
      category: "level",
    });
  });

  const xpTiers = [500, 1000, 2500, 5000, 10000, 25000, 50000];
  xpTiers.forEach((xp) => {
    list.push({
      id: `xp_${xp}`,
      icon: "sparkles",
      title: `Earn ${xp.toLocaleString()} Total XP`,
      desc: `Accumulate ${xp.toLocaleString()} XP across all activities`,
      tier: xp >= 25000 ? "legendary" : xp >= 5000 ? "epic" : xp >= 1000 ? "rare" : "common",
      category: "xp",
    });
  });

  const coinTiers = [100, 500, 1000, 5000];
  coinTiers.forEach((c) => {
    list.push({ id: `coins_${c}`, icon: "coins", title: `Collect ${c} Coins`, desc: `Hold ${c} coins at once`, tier: c >= 1000 ? "epic" : "common", category: "coins" });
  });

  const questTotals = [10, 25, 50, 100, 250, 500];
  questTotals.forEach((q) => {
    list.push({ id: `quests_total_${q}`, icon: "target", title: `Complete ${q} Quests`, desc: `Finish ${q} quests total`, tier: q >= 250 ? "legendary" : q >= 50 ? "epic" : q >= 25 ? "rare" : "common", category: "quest_total" });
  });

  const bossKills = [1, 5, 10, 25];
  bossKills.forEach((b) => {
    list.push({ id: `boss_kills_${b}`, icon: "shield", title: `Defeat ${b} Boss${b > 1 ? "es" : ""}`, desc: `Win ${b} boss battles`, tier: b >= 25 ? "legendary" : b >= 10 ? "epic" : "rare", category: "boss" });
  });

  // named specials / hidden achievements
  list.push(
    { id: "first_login", icon: "leaf", title: "First Bloom", desc: "Create your MindBloom account", tier: "common", category: "special" },
    { id: "night_owl", icon: "moon", title: "Night Owl", desc: "Log an activity after midnight", tier: "rare", category: "special", hidden: true },
    { id: "early_bird", icon: "sunrise", title: "Early Bird", desc: "Log an activity before 6 AM", tier: "rare", category: "special", hidden: true },
    { id: "perfect_week", icon: "award", title: "Perfect Week", desc: "Complete all daily quests 7 days in a row", tier: "epic", category: "special" },
    { id: "comeback_kid", icon: "flame", title: "Comeback Kid", desc: "Return after a broken streak and start a new one", tier: "rare", category: "special", hidden: true },
    { id: "burnout_survivor", icon: "shield", title: "Burnout Survivor", desc: "Bring burnout risk down from High to Low", tier: "legendary", category: "special", hidden: true },
    { id: "shop_first_purchase", icon: "shoppingBag", title: "First Purchase", desc: "Buy your first item from the shop", tier: "common", category: "special" },
    { id: "friend_first", icon: "users", title: "Making Friends", desc: "Add your first friend", tier: "common", category: "special" },
    { id: "journal_10", icon: "bookOpen", title: "Reflective Mind", desc: "Write 10 journal entries", tier: "rare", category: "special" },
    { id: "season_participant", icon: "calendar", title: "Season Starter", desc: "Earn XP during a season", tier: "common", category: "special" }
  );

  return list;
}

export const ACHIEVEMENTS = buildCatalog(); // 100+ entries

export function achievementById(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// checks progress against current data and unlocks anything newly earned;
// returns the list of achievements unlocked just now (for celebration UI)
export async function evaluateAchievements() {
  const player = await playerRepo.get();
  const unlockedList = await achievementsRepo.unlocked();
  const unlockedSet = new Set(unlockedList);
  const newlyUnlocked = [];

  async function tryUnlock(id) {
    if (unlockedSet.has(id)) return;
    if (await achievementsRepo.unlock(id)) {
      unlockedSet.add(id);
      const a = achievementById(id);
      if (a) newlyUnlocked.push(a);
    }
  }

  await Promise.all(
    ACHIEVEMENTS.filter((a) => a.category === "level" && player.level >= parseInt(a.id.split("_")[1], 10)).map((a) => tryUnlock(a.id))
  );
  await Promise.all(
    ACHIEVEMENTS.filter((a) => a.category === "xp" && player.totalXp >= parseInt(a.id.split("_")[1], 10)).map((a) => tryUnlock(a.id))
  );
  await Promise.all(
    ACHIEVEMENTS.filter((a) => a.category === "coins" && player.coins >= parseInt(a.id.split("_")[1], 10)).map((a) => tryUnlock(a.id))
  );

  const totalQuests = await questRepo.completedTotal();
  await Promise.all(
    ACHIEVEMENTS.filter((a) => a.category === "quest_total" && totalQuests >= parseInt(a.id.split("_").at(-1), 10)).map((a) => tryUnlock(a.id))
  );

  const streaks = await habitStreaks();
  await Promise.all(
    ACHIEVEMENTS.filter((a) => ["water", "sleep", "mood", "focus", "quest"].includes(a.category)).map((a) => {
      const n = parseInt(a.id.split("_").at(-1), 10);
      return (streaks[a.category] || 0) >= n ? tryUnlock(a.id) : null;
    })
  );

  return newlyUnlocked;
}

async function habitStreaks() {
  const [water, sleep, mood, focus] = await Promise.all([
    waterRepo.history(100),
    sleepRepo.history(100),
    moodRepo.history(100),
    focusRepo.history(100),
  ]);
  return {
    water: consecutiveDays(water.filter((d) => (d.ml || 0) > 0).map((d) => d.date)),
    sleep: consecutiveDays(sleep.filter((d) => (d.hours || 0) > 0).map((d) => d.date)),
    mood: consecutiveDays(mood.filter((d) => d.mood != null).map((d) => d.date)),
    focus: consecutiveDays([...new Set(focus.map((d) => d.date))]),
    quest: 0,
  };
}

function consecutiveDays(dates) {
  if (!dates.length) return 0;
  const sorted = [...new Set(dates)].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]) - new Date(sorted[i - 1])) / 86400000;
    cur = diff === 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
  }
  return best;
}
