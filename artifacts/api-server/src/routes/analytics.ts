import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  attemptsTable,
  practiceAttemptsTable,
  assignmentsTable,
  problemsTable,
} from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetTopicAnalyticsResponse,
  GetRecentActivityResponse,
  GenerateReportResponse,
  GetAssignmentFocusResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";

const router: IRouter = Router();

type StrengthLabel = "strong" | "solid" | "developing" | "weak" | "untested";
function labelFor(accuracy: number, attempts: number): StrengthLabel {
  if (attempts === 0) return "untested";
  if (accuracy >= 0.9) return "strong";
  if (accuracy >= 0.75) return "solid";
  if (accuracy >= 0.5) return "developing";
  return "weak";
}

async function topicStats() {
  const topics = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
  const stats = await db.execute(sql`
    select topic_id, count(*)::int as n, avg(case when correct then 1.0 else 0.0 end) as acc
    from practice_attempts group by topic_id
  `);
  const byId = new Map<number, { n: number; acc: number }>();
  for (const r of stats.rows as Array<{ topic_id: number; n: number; acc: number }>) {
    byId.set(Number(r.topic_id), { n: Number(r.n), acc: Number(r.acc) });
  }
  return topics.map((t) => {
    const s = byId.get(t.id);
    const attempts = s?.n ?? 0;
    const accuracy = attempts === 0 ? 0 : s!.acc;
    return {
      topicId: t.id,
      topicTitle: t.title,
      weekNumber: t.weekNumber,
      attempts,
      accuracy: Number(accuracy.toFixed(3)),
      strengthLabel: labelFor(accuracy, attempts),
    };
  });
}

router.get("/analytics/summary", async (_req, res) => {
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.status, "submitted"));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const practice = await db.select().from(practiceAttemptsTable);
  const practiceCorrect = practice.filter((p) => p.correct).length;
  const practiceAccuracy =
    practice.length === 0 ? 0 : (practiceCorrect / practice.length) * 100;

  const days = new Set<string>();
  for (const p of practice) days.add(new Date(p.createdAt).toISOString().slice(0, 10));
  for (const a of submitted)
    if (a.submittedAt) days.add(new Date(a.submittedAt).toISOString().slice(0, 10));

  // streak: consecutive days ending today
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streakDays++;
    else if (i > 0) break;
  }

  const topics = await topicStats();
  const tested = topics.filter((t) => t.attempts > 0);
  tested.sort((a, b) => b.accuracy - a.accuracy);
  const strongest = tested[0]?.topicTitle ?? null;
  const weakest = tested[tested.length - 1]?.topicTitle ?? null;

  res.json(
    GetAnalyticsSummaryResponse.parse({
      officialAverage: Number(officialAverage.toFixed(2)),
      practiceAccuracy: Number(practiceAccuracy.toFixed(2)),
      attemptsCount: submitted.length,
      practiceCount: practice.length,
      streakDays,
      strongestTopic: strongest,
      weakestTopic: weakest,
    }),
  );
});

router.get("/analytics/topics", async (_req, res) => {
  const rows = await topicStats();
  res.json(GetTopicAnalyticsResponse.parse(rows));
});

router.get("/analytics/activity", async (_req, res) => {
  const recentPractice = await db
    .select({
      id: practiceAttemptsTable.id,
      createdAt: practiceAttemptsTable.createdAt,
      correct: practiceAttemptsTable.correct,
      topicId: practiceAttemptsTable.topicId,
    })
    .from(practiceAttemptsTable)
    .orderBy(desc(practiceAttemptsTable.id))
    .limit(20);
  const topics = await db.select().from(topicsTable);
  const topicById = new Map(topics.map((t) => [t.id, t.title]));

  const recentAttempts = await db
    .select({
      id: attemptsTable.id,
      submittedAt: attemptsTable.submittedAt,
      scorePercent: attemptsTable.scorePercent,
      assignmentId: attemptsTable.assignmentId,
    })
    .from(attemptsTable)
    .where(eq(attemptsTable.status, "submitted"))
    .orderBy(desc(attemptsTable.id))
    .limit(20);
  const assignments = await db.select().from(assignmentsTable);
  const aById = new Map(assignments.map((a) => [a.id, a.title]));

  const items = [
    ...recentPractice.map((p) => ({
      id: p.id,
      kind: "practice" as const,
      title: `Practice — ${topicById.get(p.topicId) ?? "Topic"}`,
      at: p.createdAt.toISOString(),
      score: p.correct ? 100 : 0,
      topicTitle: topicById.get(p.topicId) ?? null,
    })),
    ...recentAttempts.map((a) => ({
      id: a.id + 1_000_000,
      kind: "assignment" as const,
      title: aById.get(a.assignmentId) ?? "Assignment",
      at: (a.submittedAt ?? new Date()).toISOString(),
      score: a.scorePercent ?? null,
      topicTitle: null,
    })),
  ].sort((x, y) => y.at.localeCompare(x.at));

  res.json(GetRecentActivityResponse.parse(items.slice(0, 30)));
});

router.post("/analytics/report", async (_req, res) => {
  const topics = await topicStats();
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.status, "submitted"));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const tested = topics.filter((t) => t.attempts > 0);
  tested.sort((a, b) => a.accuracy - b.accuracy);
  const weakest = tested.slice(0, 3).map((t) => t.topicTitle);
  const strongest = tested.slice(-3).reverse().map((t) => t.topicTitle);

  let narrative = "";
  let recommendations: string[] = [];
  try {
    const out = await chatJson<{ narrative: string; recommendations: string[] }>(
      "You are an academic advisor for a college ethics course. Write a 2-paragraph, encouraging but honest narrative summary, then list 3 concrete next-step recommendations. Strict JSON: {\"narrative\": string, \"recommendations\": string[]}.",
      JSON.stringify({
        officialAverage,
        attempts: submitted.length,
        weakestTopics: weakest,
        strongestTopics: strongest,
        perTopic: topics,
      }),
    );
    narrative = out.narrative;
    recommendations = out.recommendations ?? [];
  } catch {
    narrative =
      tested.length === 0
        ? "You haven't accumulated enough graded work yet to draw conclusions. Try a practice session or finish a homework, then regenerate this report."
        : `You're averaging ${officialAverage.toFixed(
            1,
          )}% on official assignments. Your strongest area so far is ${
            strongest[0] ?? "n/a"
          }; your weakest is ${weakest[0] ?? "n/a"}.`;
    recommendations =
      weakest.length > 0
        ? weakest.map((w) => `Run a focused practice session on ${w}.`)
        : ["Open a homework and start with a small set of problems."];
  }

  res.json(
    GenerateReportResponse.parse({
      generatedAt: new Date().toISOString(),
      narrative,
      strengths: strongest,
      weaknesses: weakest,
      recommendations,
    }),
  );
});

type Priority = "high" | "medium" | "low" | "ready";
function priorityFor(label: StrengthLabel): Priority {
  if (label === "untested" || label === "weak") return "high";
  if (label === "developing") return "medium";
  if (label === "solid") return "low";
  return "ready";
}

function pointerFor(
  title: string,
  label: StrengthLabel,
  attempts: number,
  correct: number,
): string {
  switch (label) {
    case "untested":
      return `No practice logged on "${title}" yet. Start here — run a practice set before the graded version so this isn't your first attempt.`;
    case "weak":
      return `Only ${correct}/${attempts} practice questions right on "${title}". This is your biggest risk — drill it repeatedly and read the feedback before attempting the graded version.`;
    case "developing":
      return `${correct}/${attempts} correct on "${title}". You're getting it, but it's not automatic. A few more practice reps and a re-read of the feedback will lock it in.`;
    case "solid":
      return `${correct}/${attempts} correct on "${title}". Mostly there — one quick practice pass to catch edge cases and you're set.`;
    case "strong":
      return `${correct}/${attempts} correct on "${title}". You've got this one — a light review is plenty.`;
  }
}

router.get("/assignments/:assignmentId/focus", async (req, res): Promise<void> => {
  const assignmentId = Number(req.params.assignmentId);
  if (!Number.isFinite(assignmentId)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, assignmentId));
  if (!assignment) {
    res.status(404).json({ error: "assignment not found" });
    return;
  }

  // The distinct topics this assignment's graded problems cover.
  const topicRows = await db
    .selectDistinct({ topicId: problemsTable.topicId, topicTitle: topicsTable.title })
    .from(problemsTable)
    .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(problemsTable.assignmentId, assignmentId));

  // Per-topic logged practice (the evolving profile lives in practice_attempts).
  const statRows = await db.execute(sql`
    select topic_id,
           count(*)::int as n,
           sum(case when correct then 1 else 0 end)::int as c
    from practice_attempts
    group by topic_id
  `);
  const byTopic = new Map<number, { n: number; c: number }>();
  for (const r of statRows.rows as Array<{ topic_id: number; n: number; c: number }>) {
    byTopic.set(Number(r.topic_id), { n: Number(r.n), c: Number(r.c) });
  }

  const topics = topicRows
    .filter((t) => t.topicId != null)
    .map((t) => {
      const s = byTopic.get(t.topicId);
      const attempts = s?.n ?? 0;
      const correct = s?.c ?? 0;
      const accuracy = attempts === 0 ? 0 : correct / attempts;
      const label = labelFor(accuracy, attempts);
      const title = t.topicTitle ?? "this topic";
      return {
        topicId: t.topicId,
        topicTitle: title,
        attempts,
        accuracy: Number(accuracy.toFixed(3)),
        strengthLabel: label,
        priority: priorityFor(label),
        pointer: pointerFor(title, label, attempts, correct),
      };
    });

  // Readiness: accuracy across tested topics, scaled by how much of the assignment you've actually practiced.
  const totalTopics = topics.length || 1;
  const tested = topics.filter((t) => t.attempts > 0);
  const totalAttempts = tested.reduce((s, t) => s + t.attempts, 0);
  const totalCorrect = tested.reduce((s, t) => s + Math.round(t.accuracy * t.attempts), 0);
  const accComponent = totalAttempts === 0 ? 0 : totalCorrect / totalAttempts;
  const coverage = tested.length / totalTopics;
  const readiness = Math.round(accComponent * coverage * 100);

  // Order high-priority topics first so the panel reads as a focus list.
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2, ready: 3 };
  topics.sort((a, b) => order[a.priority] - order[b.priority] || a.accuracy - b.accuracy);

  const highPriority = topics.filter((t) => t.priority === "high").map((t) => t.topicTitle);
  let headline: string;
  if (topics.length === 0) {
    headline = "This assignment has no topics linked yet.";
  } else if (tested.length === 0) {
    headline = `You haven't practiced any of this assignment's ${totalTopics} topics yet. Run a practice set first — it regenerates fresh scenarios every time and never shows the graded questions.`;
  } else if (highPriority.length > 0) {
    headline = `You're about ${readiness}% ready. Focus your practice on ${highPriority
      .slice(0, 3)
      .join(", ")} before attempting the graded version.`;
  } else {
    headline = `You're about ${readiness}% ready — strong across the board. A light practice pass and you're good to submit.`;
  }

  res.json(
    GetAssignmentFocusResponse.parse({
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      readiness,
      headline,
      topics,
    }),
  );
});

export default router;
