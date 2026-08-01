import { studyPlannerRepo } from "../repositories.js";
import { grantXpAndCelebrate } from "./_actions.js";
import { buildWellbeingSnapshot } from "../ai.js";
import { daysBetween, todayKey } from "../utils.js";
import { icon } from "../icons.js";
import { aiBanner } from "../components.js";

export async function render(container) {
  container.innerHTML = `
    <div class="screen-title"><h2>Study planner</h2><p class="muted">Tasks, homework, and exam countdowns</p></div>
    <div class="glass-card section">
      <h3>Add task</h3>
      <input id="task-title" placeholder="Title (e.g. Physics Chapter 4)" />
      <select id="task-type">
        <option value="homework">Homework</option>
        <option value="revision">Revision</option>
        <option value="exam">Exam</option>
      </select>
      <input id="task-date" type="date" />
      <button id="task-add" class="gradient-btn">Add</button>
    </div>
    <div class="flex-between section">
      <h3 style="margin:0;">Your tasks</h3>
      <button id="ai-plan-btn" class="ghost-btn small-btn">AI revision plan</button>
    </div>
    <div id="ai-plan-output"></div>
    <div class="list" id="task-list"></div>
  `;

  await drawList();

  container.querySelector("#task-add").addEventListener("click", async () => {
    const title = container.querySelector("#task-title").value.trim();
    const type = container.querySelector("#task-type").value;
    const dueDate = container.querySelector("#task-date").value;
    if (!title) return;
    await studyPlannerRepo.add({ title, type, dueDate });
    await grantXpAndCelebrate(5, "planner task added");
    container.querySelector("#task-title").value = "";
    await drawList();
  });

  container.querySelector("#ai-plan-btn").addEventListener("click", async () => {
    const snapshot = await buildWellbeingSnapshot();
    const exams = (await studyPlannerRepo.exams()).filter((e) => !e.done);
    const plan = buildRevisionPlan(exams, snapshot);
    container.querySelector("#ai-plan-output").innerHTML = `<div class="section">${aiBanner("AI revision plan", plan)}</div>`;
  });

  async function drawList() {
    const tasks = await studyPlannerRepo.all();
    container.querySelector("#task-list").innerHTML = tasks.length
      ? tasks.map((t) => {
          const daysLeft = t.dueDate ? daysBetween(todayKey(), t.dueDate) : null;
          const iconName = t.type === "exam" ? "fileText" : t.type === "revision" ? "repeat" : "bookOpen";
          return `<div class="list-item">
            <span class="icon-wrap">${icon(iconName, { size: 17 })}</span>
            <div class="main"><div class="title">${t.title}</div><div class="sub">${t.dueDate ? `Due ${t.dueDate}${daysLeft !== null ? ` (${daysLeft}d)` : ""}` : "No date"} · ${t.type}</div></div>
            <button class="checkbox-btn ${t.done ? "done" : ""}" data-id="${t.id}"></button>
          </div>`;
        }).join("")
      : `<p class="muted">No tasks yet — add homework, revision, or exams above.</p>`;

    container.querySelectorAll("#task-list .checkbox-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await studyPlannerRepo.toggle(btn.dataset.id);
        await grantXpAndCelebrate(8, "task complete");
        await drawList();
      });
    });
  }
}

function buildRevisionPlan(exams, snapshot) {
  if (!exams.length) return "No exams scheduled yet — add one above and I'll build a revision plan around it.";
  const next = exams.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  const daysLeft = next.dueDate ? daysBetween(todayKey(), next.dueDate) : 7;
  const sessionsPerDay = snapshot.avgSleep < 6.5 ? 1 : daysLeft <= 3 ? 3 : 2;
  return `${next.title} is in ${daysLeft} day(s). Given your recent sleep and focus levels, aim for ${sessionsPerDay} Pomodoro session(s) per day, reviewing one topic per session, with a full rest day before the exam.`;
}
