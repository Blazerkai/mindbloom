// Small reusable HTML-snippet builders shared across screens.
import { icon } from "./icons.js";

export function statTile(value, label) {
  return `<div class="glass-card stat-tile"><div class="value">${value}</div><div class="label">${label}</div></div>`;
}

export function xpBar(current, max) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return `<div class="xp-bar"><div style="width:${pct}%"></div></div>`;
}

export function gauge(percent, label) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return `
    <div class="gauge">
      <svg viewBox="0 0 148 148">
        <circle class="track" cx="74" cy="74" r="${r}" />
        <circle class="fill" cx="74" cy="74" r="${r}"
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" />
      </svg>
      <div class="gauge-value"><div class="num">${Math.round(percent)}</div><div class="sub">${label}</div></div>
    </div>`;
}

export function pill(text, kind = "") {
  return `<span class="pill ${kind}">${text}</span>`;
}

export function card(innerHtml, extraClass = "") {
  return `<div class="glass-card ${extraClass}">${innerHtml}</div>`;
}

export function listItem({ iconName, title, sub, right }) {
  return `<div class="list-item">
    <span class="icon-wrap">${icon(iconName || "sparkles", { size: 17 })}</span>
    <div class="main"><div class="title">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
    ${right || ""}
  </div>`;
}

export function aiBanner(title, text) {
  return `<div class="ai-banner"><span class="icon-wrap">${icon("cpu", { size: 20 })}</span><div><h4>${title}</h4><p>${text}</p></div></div>`;
}

export function sectionTitle(title, action = "") {
  return `<div class="flex-between section"><h3 style="margin:0;">${title}</h3>${action}</div>`;
}

export function skeleton(height = "80px") {
  return `<div class="skel" style="height:${height};border-radius:14px;"></div>`;
}
