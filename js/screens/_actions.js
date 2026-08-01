import { playerRepo } from "../repositories.js";
import { celebrateGrant, achievementUnlockToast, toast } from "../fx.js";
import { evaluateAchievements } from "../achievements.js";
import { refreshTopbar } from "../app.js";

export async function grantXpAndCelebrate(amount, reason, coins = 0) {
  const result = await playerRepo.grantXp(amount, reason);
  if (coins) await playerRepo.addCoins(coins);
  await playerRepo.touchStreak();
  celebrateGrant(result);
  const newly = await evaluateAchievements();
  newly.forEach((a) => achievementUnlockToast(a));
  if (!result.leveledUp) toast(`+${amount} XP${coins ? ` · +${coins} coins` : ""}`, "xp");
  await refreshTopbar();
  return result;
}
