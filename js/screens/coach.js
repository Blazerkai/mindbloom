import { buildWellbeingSnapshot, askCoach, coachHeuristics } from "../ai.js";
import { coachRepo } from "../repositories.js";
import { el } from "../utils.js";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>AI personal coach</h2><p class="muted">Remembers your history — not just a chatbot</p></div>
    <div class="glass-card">
      <div class="chat-window" id="chat-window"></div>
      <div class="chat-input-row">
        <input id="chat-input" placeholder="Talk to your coach..." />
        <button id="chat-send" class="gradient-btn">Send</button>
      </div>
    </div>
  `;

  const window_ = container.querySelector("#chat-window");
  let history = await coachRepo.history();
  if (history.length === 0) {
    const snapshot = await buildWellbeingSnapshot();
    const opener = coachHeuristics(snapshot)[0];
    await coachRepo.add("ai", `Hi, I'm your MindBloom coach. ${opener}`);
    history = await coachRepo.history();
  }
  renderHistory(history);

  function renderHistory(rows) {
    window_.innerHTML = "";
    rows.forEach((msg) => {
      window_.appendChild(el(`<div class="chat-bubble ${msg.role === "user" ? "user" : "ai"}">${escapeHtml(msg.text)}</div>`));
    });
    window_.scrollTop = window_.scrollHeight;
  }

  async function send() {
    const input = container.querySelector("#chat-input");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    window_.appendChild(el(`<div class="chat-bubble user">${escapeHtml(text)}</div>`));
    window_.scrollTop = window_.scrollHeight;
    const thinking = el(`<div class="chat-bubble ai">…</div>`);
    window_.appendChild(thinking);
    window_.scrollTop = window_.scrollHeight;

    const snapshot = await buildWellbeingSnapshot();
    const reply = await askCoach(text, snapshot);
    thinking.remove();
    window_.appendChild(el(`<div class="chat-bubble ai">${escapeHtml(reply)}</div>`));
    window_.scrollTop = window_.scrollHeight;
  }

  container.querySelector("#chat-send").addEventListener("click", send);
  container.querySelector("#chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
