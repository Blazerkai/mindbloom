import { notificationsRepo } from "../repositories.js";
import { buildWellbeingSnapshot } from "../ai.js";
import { listItem } from "../components.js";

export function generateSmartNotifications(snapshot) {
  const msgs = [];
  if (snapshot.avgWater < 1500) msgs.push("Yesterday your hydration was below target — try to drink a glass now.");
  if (snapshot.questCompletionRate !== null && snapshot.questCompletionRate >= 0.66) msgs.push("You've almost completed today's quests — one more to go.");
  if (snapshot.focusMinutes > 0) msgs.push("You usually study around this time — want to start a focus session?");
  if (snapshot.avgStress >= 6) msgs.push("Stress has been a bit high — take a 15-minute break.");
  return msgs;
}

export async function render(container) {
  const snapshot = await buildWellbeingSnapshot();
  const smart = generateSmartNotifications(snapshot);
  const existing = await notificationsRepo.all();
  if (smart.length && existing.length < 3) {
    await Promise.all(smart.map((m) => notificationsRepo.add(m)));
  }
  await notificationsRepo.markAllRead();

  const items = await notificationsRepo.all();
  container.innerHTML = `
    <div class="screen-title"><h2>Notifications</h2><p class="muted">Personalized by the AI engine</p></div>
    <div class="list">${items.length ? items.map((n) => listItem({ iconName: "bell", title: n.message, sub: new Date(n.ts).toLocaleString() })).join("") : `<p class="muted">No notifications yet.</p>`}</div>
  `;
}
