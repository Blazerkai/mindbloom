import { supabase, hasSupabase } from "./supabaseClient.js";
import {
  waterRepo, sleepRepo, moodRepo, journalRepo, focusRepo, questRepo,
  playerRepo, studyPlannerRepo, goalsRepo, coachRepo,
} from "./repositories.js";
import { avg, clamp, daysBetween, todayKey } from "./utils.js";

// ======================================================================
// 1. SNAPSHOT BUILDER — aggregates every tracked signal into one object.
//    Every AI-facing feature (coach, burnout, future-you, quests, reports,
//    journal analysis) reads from this single snapshot instead of each
//    hand-rolling its own data pull.
// ======================================================================
export async function buildWellbeingSnapshot() {
  const [water, sleep, mood, journal, focus, quests, player, goals, exams] = await Promise.all([
    waterRepo.history(7),
    sleepRepo.history(7),
    moodRepo.history(7),
    journalRepo.history(10),
    focusRepo.history(7),
    questRepo.todaysQuests(),
    playerRepo.get(),
    goalsRepo.all(),
    studyPlannerRepo.exams(),
  ]);
  const openExams = exams.filter((e) => !e.done);

  const avgSleep = avg(sleep.map((s) => s.hours || 0));
  const avgWater = avg(water.map((w) => w.ml || 0));
  const avgMood = avg(mood.map((m) => m.mood ?? 5));
  const avgStress = avg(mood.map((m) => m.stress ?? 5));
  const avgEnergy = avg(mood.map((m) => m.energy ?? 5));
  const focusMinutes = focus.reduce((a, f) => a + (f.minutes || 0), 0);
  const questCompletionRate =
    quests.length > 0 ? quests.filter((q) => q.completed).length / quests.length : null;

  const nextExam = openExams.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  const daysToExam = nextExam ? daysBetween(todayKey(), nextExam.dueDate) : null;

  const sleepTrend = trend(sleep.map((s) => s.hours || 0));
  const moodTrend = trend(mood.map((m) => m.mood ?? 5));

  return {
    date: todayKey(),
    player,
    avgSleep, avgWater, avgMood, avgStress, avgEnergy,
    focusMinutes, questCompletionRate,
    sleepTrend, moodTrend,
    daysToExam, nextExam,
    goals, journalCount: journal.length, journal,
    raw: { water, sleep, mood, focus },
  };
}

function trend(values) {
  if (values.length < 3) return "flat";
  const first = avg(values.slice(0, Math.ceil(values.length / 2)));
  const second = avg(values.slice(Math.ceil(values.length / 2)));
  if (second - first > 0.4) return "improving";
  if (first - second > 0.4) return "declining";
  return "flat";
}

// ======================================================================
// 2. GEMINI CLIENT — calls a Supabase Edge Function (supabase/functions/
//    gemini-proxy) that holds the Gemini key server-side, so it never ships
//    to the browser. Every call falls back to deterministic local logic
//    (below) when Supabase isn't configured, the function isn't deployed,
//    or the call fails for any reason.
// ======================================================================
export let lastGeminiError = null;

async function callGemini(prompt) {
  if (!hasSupabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke("gemini-proxy", { body: { prompt } });
    if (error) {
      lastGeminiError = error.message;
      console.warn("Gemini proxy call failed:", lastGeminiError);
      return null;
    }
    if (!data?.text) {
      lastGeminiError = data?.error || "No text in response";
      console.warn("Gemini proxy returned no text:", data);
      return null;
    }
    lastGeminiError = null;
    return data.text;
  } catch (e) {
    lastGeminiError = e.message;
    console.warn("Gemini proxy call threw:", e);
    return null;
  }
}

// Lightweight connectivity check used by the Settings screen's "Test AI" button.
export async function testGeminiConnection() {
  if (!hasSupabase) return { ok: false, message: "Connect Supabase first — the AI proxy runs as a Supabase Edge Function." };
  const reply = await callGemini('Reply with exactly one word: "Connected".');
  if (reply) return { ok: true, message: reply };
  return { ok: false, message: lastGeminiError || "Unknown error — check the browser console, or confirm the gemini-proxy function is deployed with its GEMINI_API_KEY secret set." };
}

// ======================================================================
// 3. BURNOUT PREDICTION
// ======================================================================
export function computeBurnout(snapshot) {
  const s = snapshot;
  let score = 0;
  const reasons = [];

  if (s.avgSleep && s.avgSleep < 6) { score += 28; reasons.push("Sleep has averaged under 6 hours this week"); }
  else if (s.avgSleep && s.avgSleep < 7) { score += 12; reasons.push("Sleep is a bit below the 7-8h target"); }

  if (s.avgStress >= 7) { score += 22; reasons.push("Stress levels have been consistently high"); }
  else if (s.avgStress >= 5.5) { score += 10; reasons.push("Stress has been trending upward"); }

  if (s.moodTrend === "declining") { score += 18; reasons.push("Mood has been trending downward"); }

  if (s.avgWater && s.avgWater < 1200) { score += 8; reasons.push("Hydration has been below target"); }

  if (s.focusMinutes > 600) { score += 12; reasons.push("Study workload has been very high this week"); }

  if (s.daysToExam !== null && s.daysToExam <= 7) { score += 14; reasons.push(`An exam is only ${s.daysToExam} day(s) away`); }

  if (s.questCompletionRate !== null && s.questCompletionRate < 0.3) { score += 8; reasons.push("Daily quest completion has dropped"); }

  score = clamp(Math.round(score), 0, 100);
  const level = score >= 65 ? "High" : score >= 35 ? "Medium" : "Low";

  const recommendations = [];
  if (s.avgSleep < 7) recommendations.push("Aim to be asleep before 10 PM tonight");
  if (s.avgStress >= 5.5) recommendations.push("Try a 5-minute breathing exercise");
  if (s.avgWater < 1500) recommendations.push("Drink a glass of water now");
  if (s.focusMinutes > 500) recommendations.push("Reduce tonight's study load and take a real break");
  if (s.moodTrend === "declining") recommendations.push("Reach out to a friend or write in your journal");
  if (recommendations.length === 0) recommendations.push("Keep up your current routine — it's working");

  if (reasons.length === 0) reasons.push("No major risk factors detected this week");

  return { score, level, reasons: reasons.slice(0, 4), recommendations: recommendations.slice(0, 5) };
}

// ======================================================================
// 4. MINDBLOOM LIFE SCORE — one master 0-100 wellbeing score
// ======================================================================
export function computeLifeScore(snapshot) {
  const s = snapshot;
  const sleepScore = clamp((s.avgSleep / 8) * 100, 0, 100);
  const moodScore = clamp((s.avgMood / 10) * 100, 0, 100);
  const waterScore = clamp((s.avgWater / 2000) * 100, 0, 100);
  const stressScore = clamp(100 - (s.avgStress / 10) * 100, 0, 100);
  const focusScore = clamp((s.focusMinutes / 300) * 100, 0, 100);
  const consistencyScore = clamp((s.questCompletionRate ?? 0.5) * 100, 0, 100);

  const breakdown = {
    Sleep: Math.round(sleepScore),
    Mood: Math.round(moodScore),
    Hydration: Math.round(waterScore),
    "Low Stress": Math.round(stressScore),
    Focus: Math.round(focusScore),
    Consistency: Math.round(consistencyScore),
  };
  const overall = Math.round(avg(Object.values(breakdown)));
  return { overall, breakdown };
}

// ======================================================================
// 5. FUTURE YOU — projects wellbeing forward if current habits continue
// ======================================================================
export function computeFutureYou(snapshot, burnout, lifeScore) {
  const momentum = snapshot.moodTrend === "improving" ? 1 : snapshot.moodTrend === "declining" ? -1 : 0;
  const consistencyBonus = (snapshot.questCompletionRate ?? 0.5) >= 0.6 ? 1 : -1;
  const direction = momentum + consistencyBonus;

  const predictedBurnout = clamp(burnout.score + (direction < 0 ? 14 : -10), 0, 100);
  const predictedLifeScore = clamp(lifeScore.overall + (direction > 0 ? 9 : -9), 0, 100);
  const predictedFocus = clamp(lifeScore.breakdown.Focus + (direction > 0 ? 8 : -6), 0, 100);
  const predictedMood = direction > 0 ? "Improving" : direction < 0 ? "Declining" : "Stable";
  const predictedExamPerformance = clamp(
    60 + predictedFocus * 0.2 + predictedLifeScore * 0.2 - predictedBurnout * 0.15,
    0, 100
  );

  return {
    predictedBurnout: Math.round(predictedBurnout),
    predictedLifeScore: Math.round(predictedLifeScore),
    predictedFocus: Math.round(predictedFocus),
    predictedMood,
    predictedExamPerformance: Math.round(predictedExamPerformance),
    direction,
  };
}

// ======================================================================
// 6. AI DAILY QUEST GENERATOR
// ======================================================================
export function generateDailyQuests(snapshot) {
  const quests = [];
  const yesterdayWater = snapshot.raw.water.at(-2)?.ml || 1000;
  quests.push({
    icon: "droplet",
    title: `Drink ${yesterdayWater + 300}ml of water today`,
    type: "water",
    target: yesterdayWater + 300,
    xp: 15,
    coins: 5,
  });

  if (snapshot.avgStress >= 5) {
    quests.push({ icon: "bookOpen", title: "Write one gratitude journal entry tonight", type: "journal", xp: 20, coins: 8 });
  } else {
    quests.push({ icon: "target", title: "Complete 2 Pomodoro sessions before 6 PM", type: "focus", target: 2, xp: 25, coins: 10 });
  }

  if (snapshot.avgMood < 6) {
    quests.push({ icon: "pulse", title: "Do a mood check-in and name one thing going well", type: "mood", xp: 15, coins: 5 });
  } else {
    quests.push({ icon: "moon", title: "Get to bed 30 minutes earlier tonight", type: "sleep", xp: 20, coins: 8 });
  }

  return quests;
}

// ======================================================================
// 7. AI COACH — history-aware, uses Gemini when available
// ======================================================================
export function coachHeuristics(snapshot) {
  const notes = [];
  if (snapshot.avgSleep < 6) notes.push("I noticed you've slept under 6 hours lately — that's usually when focus drops the most.");
  if (snapshot.moodTrend === "improving") notes.push(`Your mood has been trending up this week — nice momentum.`);
  if (snapshot.moodTrend === "declining") notes.push("Your mood has dipped a bit over the last few days.");
  if (snapshot.focusMinutes > 400) notes.push("You've put in serious study time this week.");
  if (snapshot.daysToExam !== null && snapshot.daysToExam <= 5) notes.push(`Your exam is in ${snapshot.daysToExam} days — let's plan around it, not panic about it.`);
  if (notes.length === 0) notes.push("Everything looks steady right now — let's keep the streak going.");
  return notes;
}

export async function askCoach(userMessage, snapshot) {
  await coachRepo.add("user", userMessage);
  const historyRows = await coachRepo.history();
  const history = historyRows.slice(-8).map((h) => `${h.role}: ${h.text}`).join("\n");

  const prompt = `You are MindBloom's AI wellbeing coach for a student. Speak like a warm, supportive mentor in 2-4 sentences, referencing their real data when relevant. Never sound clinical.
Student data this week: avg sleep ${snapshot.avgSleep.toFixed(1)}h, avg mood ${snapshot.avgMood.toFixed(1)}/10, avg stress ${snapshot.avgStress.toFixed(1)}/10, focus minutes ${snapshot.focusMinutes}, mood trend ${snapshot.moodTrend}, days to next exam ${snapshot.daysToExam ?? "none scheduled"}.
Conversation so far:
${history}
Respond to the student's latest message: "${userMessage}"`;

  let reply = await callGemini(prompt);
  if (!reply) {
    const heur = coachHeuristics(snapshot);
    reply = `${heur[Math.floor(Math.random() * heur.length)]} What's on your mind?`;
  }
  await coachRepo.add("ai", reply);
  return reply;
}

// ======================================================================
// 8. TODAY'S AI INSIGHT (dashboard banner)
// ======================================================================
export async function generateTodayInsight(snapshot, burnout) {
  const prompt = `In one encouraging sentence (max 22 words), give a student a personalized wellbeing insight based on: avg sleep ${snapshot.avgSleep.toFixed(1)}h, mood trend ${snapshot.moodTrend}, burnout risk ${burnout.level}, focus minutes this week ${snapshot.focusMinutes}. No preamble, just the sentence.`;
  const ai = await callGemini(prompt);
  if (ai) return ai;

  if (burnout.level === "High") return `Your burnout risk is elevated (${burnout.score}%) — tonight is a good night to rest, not grind.`;
  if (snapshot.moodTrend === "improving") return "Your mood has been climbing this week — whatever you're doing, keep it up.";
  if (snapshot.avgSleep < 6.5) return "You've been running on low sleep — an early night tonight would make tomorrow noticeably easier.";
  return "You're on a steady, healthy pace this week. Small consistent wins add up.";
}

// ======================================================================
// 9. WEEKLY AI REPORT
// ======================================================================
export async function generateWeeklyReport(snapshot, burnout, lifeScore) {
  const summaryPrompt = `Write a warm 2-sentence weekly summary for a student given: avg mood ${snapshot.avgMood.toFixed(1)}/10 (${snapshot.moodTrend}), avg sleep ${snapshot.avgSleep.toFixed(1)}h, life score ${lifeScore.overall}/100, burnout ${burnout.level}, focus minutes ${snapshot.focusMinutes}.`;
  const aiSummary = await callGemini(summaryPrompt);

  const breakdownEntries = Object.entries(lifeScore.breakdown).sort((a, b) => a[1] - b[1]);
  const weakest = breakdownEntries[0];
  const strongest = breakdownEntries.at(-1);

  return {
    week: weekKeyForReport(),
    lifeScore: lifeScore.overall,
    breakdown: lifeScore.breakdown,
    burnout,
    avgMood: snapshot.avgMood,
    avgSleep: snapshot.avgSleep,
    avgWater: snapshot.avgWater,
    focusMinutes: snapshot.focusMinutes,
    strongest: strongest?.[0],
    weakest: weakest?.[0],
    summary: aiSummary || `This week your Life Score was ${lifeScore.overall}/100. ${strongest?.[0]} was your strongest area, while ${weakest?.[0]} could use more attention. Burnout risk is currently ${burnout.level.toLowerCase()}.`,
    recommendations: burnout.recommendations,
    generatedAt: Date.now(),
  };
}

function weekKeyForReport() {
  return new Date().toISOString().slice(0, 10);
}

// ======================================================================
// 10. JOURNAL AI — emotion analysis on a single entry
// ======================================================================
export async function analyzeJournalEntry(text) {
  const prompt = `Analyze this student journal entry for stress, confidence, motivation, and happiness (each low/medium/high) and give a 1-sentence supportive reflection. Respond as compact JSON: {"stress":"","confidence":"","motivation":"","happiness":"","reflection":""}. Entry: "${text}"`;
  const ai = await callGemini(prompt);
  if (ai) {
    try {
      const match = ai.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    } catch { /* fall through to heuristic */ }
  }
  return heuristicJournalAnalysis(text);
}

function heuristicJournalAnalysis(text) {
  const lower = text.toLowerCase();
  const has = (words) => words.some((w) => lower.includes(w));
  const stress = has(["stressed", "anxious", "overwhelmed", "pressure"]) ? "high" : has(["okay", "fine"]) ? "medium" : "low";
  const confidence = has(["confident", "ready", "prepared"]) ? "high" : has(["unsure", "doubt", "worried"]) ? "low" : "medium";
  const motivation = has(["motivated", "excited", "determined"]) ? "high" : has(["tired", "unmotivated", "lazy"]) ? "low" : "medium";
  const happiness = has(["happy", "great", "grateful", "good day"]) ? "high" : has(["sad", "down", "upset"]) ? "low" : "medium";
  return { stress, confidence, motivation, happiness, reflection: "Thanks for writing this down — noticing how you feel is the first step to acting on it." };
}
