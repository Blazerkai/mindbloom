import { trustedContactsRepo } from "../repositories.js";
import { icon } from "../icons.js";

const HELPLINES = [
  { name: "988 Suicide & Crisis Lifeline", detail: "Call or text 988 — free, 24/7, confidential", tel: "988", sms: "988" },
  { name: "Crisis Text Line", detail: "Text HOME to 741741", tel: null, sms: "741741", smsBody: "HOME" },
  { name: "Emergency Services", detail: "If you or someone else is in immediate danger", tel: "911", sms: null },
];

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Emergency Help</h2><p class="muted">You're not alone — help is one tap away</p></div>
    <div class="glass-card section" style="border-color:rgba(239,68,68,0.35);">
      <h3 style="color:var(--danger);">If you're in crisis right now</h3>
      <div class="list">
        ${HELPLINES.map((h) => `
          <div class="list-item">
            <span class="icon-wrap" style="color:var(--danger);">${icon("alertTriangle", { size: 17 })}</span>
            <div class="main"><div class="title">${h.name}</div><div class="sub">${h.detail}</div></div>
            <div style="display:flex;gap:0.4rem;">
              ${h.tel ? `<a class="gradient-btn small-btn danger-btn" href="tel:${h.tel}">${icon("phone", { size: 14 })} Call</a>` : ""}
              ${h.sms ? `<a class="ghost-btn small-btn" href="sms:${h.sms}${h.smsBody ? `?&body=${h.smsBody}` : ""}">Text</a>` : ""}
            </div>
          </div>`).join("")}
      </div>
      <p class="muted" style="margin-top:0.8rem;">MindBloom is a wellbeing companion, not a replacement for professional care. If you or someone else is in immediate danger, contact local emergency services.</p>
    </div>

    <div class="flex-between section">
      <h3 style="margin:0;">Trusted contacts</h3>
    </div>
    <div class="glass-card section">
      <input id="c-name" placeholder="Name" aria-label="Contact name" />
      <input id="c-phone" placeholder="Phone number" aria-label="Contact phone number" />
      <input id="c-relation" placeholder="Relationship (e.g. Mom, Best friend, Counselor)" aria-label="Relationship to contact" />
      <button id="c-add" class="gradient-btn">Add trusted contact</button>
    </div>
    <div class="list" id="contact-list"></div>
  `;

  await drawContacts();

  container.querySelector("#c-add").addEventListener("click", async () => {
    const name = container.querySelector("#c-name").value.trim();
    const phone = container.querySelector("#c-phone").value.trim();
    const relation = container.querySelector("#c-relation").value.trim();
    if (!name || !phone) return;
    await trustedContactsRepo.add(name, phone, relation);
    ["#c-name", "#c-phone", "#c-relation"].forEach((sel) => (container.querySelector(sel).value = ""));
    await drawContacts();
  });

  async function drawContacts() {
    const contacts = await trustedContactsRepo.all();
    const list = container.querySelector("#contact-list");
    list.innerHTML = contacts.length
      ? contacts.map((c) => `
        <div class="list-item">
          <span class="icon-wrap">${icon("users", { size: 17 })}</span>
          <div class="main"><div class="title">${escapeHtml(c.name)}</div><div class="sub">${escapeHtml(c.relation || "Trusted contact")} · ${escapeHtml(c.phone)}</div></div>
          <div style="display:flex;gap:0.4rem;">
            <a class="icon-btn" href="tel:${encodeURIComponent(c.phone)}" title="Call">${icon("phone", { size: 15 })}</a>
            <button class="icon-btn" data-remove="${c.id}" title="Remove">${icon("x", { size: 14 })}</button>
          </div>
        </div>`).join("")
      : `<p class="muted">No trusted contacts yet — add someone you can reach out to above.</p>`;

    list.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await trustedContactsRepo.remove(btn.dataset.remove);
        await drawContacts();
      });
    });
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
