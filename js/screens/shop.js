import { playerRepo, shopRepo } from "../repositories.js";
import { toast } from "../fx.js";
import { icon } from "../icons.js";

export const SHOP_ITEMS = [
  { id: "title_zen", slot: "title", icon: "feather", name: "Zen Master", cost: 80 },
  { id: "title_scholar", slot: "title", icon: "bookOpen", name: "The Scholar", cost: 80 },
  { id: "title_unstoppable", slot: "title", icon: "rocket", name: "Unstoppable", cost: 150 },
  { id: "frame_gold", slot: "frame", icon: "image", name: "Gold Frame", cost: 120 },
  { id: "frame_neon", slot: "frame", icon: "image", name: "Neon Frame", cost: 120 },
  { id: "particle_sparkle", slot: "particle", icon: "sparkles", name: "Sparkle Trail", cost: 100 },
  { id: "particle_flame", slot: "particle", icon: "flame", name: "Flame Trail", cost: 140 },
  { id: "bg_galaxy", slot: "background", icon: "cloud", name: "Galaxy Background", cost: 200 },
  { id: "bg_sakura", slot: "background", icon: "cloud", name: "Sakura Background", cost: 200 },
  { id: "badge_early", slot: "badge", icon: "sunrise", name: "Early Riser Badge", cost: 60 },
];

export async function render(container) {
  const player = await playerRepo.get();
  container.innerHTML = `
    <div class="screen-title"><div><h2>Shop</h2><p class="muted">Spend coins earned from quests</p></div><div class="pill gold">${icon("coins", { size: 14 })} ${player.coins}</div></div>
    <div class="grid cols-4" id="shop-grid"></div>
  `;
  await draw();

  async function draw() {
    const p = await playerRepo.get();
    container.querySelector("#shop-grid").innerHTML = "";
    SHOP_ITEMS.forEach((item) => {
      const owned = (p.inventory || []).includes(item.id);
      const card = document.createElement("div");
      card.className = "glass-card";
      card.style.textAlign = "center";
      card.innerHTML = `
        <div class="icon-wrap" style="color:var(--accent);margin-bottom:0.4rem;">${icon(item.icon, { size: 24 })}</div>
        <div style="font-weight:600;color:var(--text-hi);">${item.name}</div>
        <div class="muted" style="font-size:0.72rem;text-transform:uppercase;">${item.slot}</div>
        <button class="${owned ? "ghost-btn" : "gradient-btn"} small-btn" style="margin-top:0.6rem;width:100%;" ${owned ? "disabled" : ""}>
          ${owned ? "Owned" : `${item.cost} coins`}
        </button>
      `;
      card.querySelector("button").addEventListener("click", async () => {
        try {
          await shopRepo.purchase(item.id, item.cost);
          toast(`Purchased ${item.name}`, "success");
          await draw();
          const updated = await playerRepo.get();
          container.querySelector(".pill.gold").innerHTML = `${icon("coins", { size: 14 })} ${updated.coins}`;
        } catch (e) {
          toast(e.message, "info");
        }
      });
      container.querySelector("#shop-grid").appendChild(card);
    });
  }
}
