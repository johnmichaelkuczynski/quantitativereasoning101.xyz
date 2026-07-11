import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  attemptsTable,
  answersTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
  assessmentInstancesTable,
  assessmentProblemsTable,
} from "@workspace/db";
import { chatText, chatJson, FAST_MODEL } from "../lib/ai";
import { detect } from "../lib/detection";
import { gradeAnswer } from "../lib/grading";

const router: IRouter = Router();

type Step = {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};

async function run(name: string, fn: () => Promise<string | void>): Promise<Step> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t0, detail: detail ?? undefined };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { name, ok: false, ms: Date.now() - t0, error: err };
  }
}

// ---------- Diagnostic 1: system checks ----------
router.get("/diagnostics/system", async (_req, res) => {
  const steps: Step[] = [];

  steps.push(
    await run("Environment: DATABASE_URL present", async () => {
      if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
      return "ok";
    }),
  );

  steps.push(
    await run("Database: SELECT 1", async () => {
      const r = await db.execute(sql`select 1 as ok`);
      const ok = (r.rows[0] as { ok?: number } | undefined)?.ok;
      if (Number(ok) !== 1) throw new Error("unexpected result");
      return "round-trip ok";
    }),
  );

  steps.push(
    await run("Database: course content seeded", async () => {
      const t = await db.select().from(topicsTable);
      const l = await db.select().from(lecturesTable);
      const a = await db.select().from(assignmentsTable);
      const p = await db.select().from(problemsTable);
      if (t.length < 28) throw new Error(`only ${t.length} topics`);
      if (l.length < 1) throw new Error("no lectures");
      if (a.length < 1) throw new Error("no assignments");
      if (p.length < 1) throw new Error("no problems");
      return `${t.length} topics · ${l.length} lectures · ${a.length} assignments · ${p.length} problems`;
    }),
  );

  steps.push(
    await run("OpenAI integration: chat completion (fast model)", async () => {
      const txt = await chatText(
        "You answer with a single word only.",
        "Reply with exactly the word PONG.",
        FAST_MODEL,
      );
      if (!txt) throw new Error("empty completion");
      return `responded (${txt.length} chars)`;
    }),
  );

  steps.push(
    await run("OpenAI integration: JSON mode", async () => {
      const out = await chatJson<{ ok: boolean }>(
        "Reply only with strict JSON.",
        'Return exactly {"ok": true}.',
        FAST_MODEL,
      );
      if (!out || out.ok !== true) throw new Error("did not return ok:true");
      return "json round-trip ok";
    }),
  );

  steps.push(
    await run("Detection pipeline: heuristic + scoring", async () => {
      const r = await detect("The quick brown fox jumps over the lazy dog.", {
        keystrokeCount: 40,
        eraseCount: 2,
        bulkInsertCount: 0,
        longestBulkInsertChars: 0,
        rewriteSegments: 0,
        durationMs: 8000,
      });
      if (typeof r.aiScore !== "number") throw new Error("no aiScore");
      return `aiScore=${r.aiScore.toFixed(2)} diachronic=${r.diachronicScore.toFixed(2)}`;
    }),
  );

  steps.push(
    await run("Grader: equivalence check", async () => {
      const g = await gradeAnswer({
        prompt: "What is 2 + 2?",
        correctAnswer: "4",
        userAnswer: "four",
      });
      if (!g.correct) throw new Error('"four" should equal "4"');
      return "semantic equivalence ok";
    }),
  );

  const ok = steps.every((s) => s.ok);
  res.json({ ok, generatedAt: new Date().toISOString(), steps });
});

// ---------- Diagnostic 2: synthetic student ----------
function syntheticTrace(text: string, durationMs = 12_000) {
  return {
    keystrokeCount: Math.max(1, text.length),
    eraseCount: 1,
    bulkInsertCount: 0,
    longestBulkInsertChars: 0,
    rewriteSegments: 0,
    durationMs,
  };
}

router.post("/diagnostics/synthetic-run", async (_req, res) => {
  const steps: Step[] = [];
  res.setTimeout(10 * 60 * 1000);

  // Course discovery
  let topics: { id: number; title: string; weekNumber: number }[] = [];
  let lectures: { id: number; body: string }[] = [];
  let assignments: { id: number; title: string; weekNumber: number; kind: string }[] = [];

  steps.push(
    await run("Load course catalog", async () => {
      const t = await db.select().from(topicsTable).orderBy(asc(topicsTable.position));
      topics = t.map((x) => ({ id: x.id, title: x.title, weekNumber: x.weekNumber }));
      const l = await db.select().from(lecturesTable).orderBy(asc(lecturesTable.id));
      lectures = l.map((x) => ({ id: x.id, body: x.body }));
      const a = await db
        .select()
        .from(assignmentsTable)
        .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
      assignments = a.map((x) => ({
        id: x.id,
        title: x.title,
        weekNumber: x.weekNumber,
        kind: x.kind,
      }));
      return `${topics.length} topics, ${lectures.length} lectures, ${assignments.length} assignments`;
    }),
  );

  steps.push(
    await run("Read each lecture", async () => {
      let total = 0;
      for (const l of lectures) {
        const [row] = await db
          .select()
          .from(lecturesTable)
          .where(eq(lecturesTable.id, l.id));
        if (!row) throw new Error(`lecture ${l.id} missing`);
        total += (row.body ?? "").length;
      }
      return `read ${lectures.length} lectures (${total} chars total)`;
    }),
  );

  // Walk every assignment: start, answer each problem, submit
  for (const a of assignments) {
    steps.push(
      // eslint-disable-next-line no-loop-func
      await run(
        `Assignment "${a.title}" (week ${a.weekNumber}, ${a.kind})`,
        async () => {
          const problems = await db
            .select()
            .from(problemsTable)
            .where(eq(problemsTable.assignmentId, a.id))
            .orderBy(asc(problemsTable.position));
          if (problems.length === 0) throw new Error("no problems");

          // Start (or resume) attempt
          const [existing] = await db
            .select()
            .from(attemptsTable)
            .where(eq(attemptsTable.assignmentId, a.id));
          let attemptId: number;
          if (existing && existing.status === "in_progress") {
            attemptId = existing.id;
          } else {
            const [created] = await db
              .insert(attemptsTable)
              .values({ assignmentId: a.id, status: "in_progress" })
              .returning();
            if (!created) throw new Error("could not start attempt");
            attemptId = created.id;
          }

          // Save an answer for every problem
          for (const p of problems) {
            const synthetic = p.correctAnswer; // synthetic student "knows" the answer
            const trace = syntheticTrace(synthetic);
            await db
              .insert(answersTable)
              .values({
                attemptId,
                problemId: p.id,
                answer: synthetic,
                keystrokeCount: trace.keystrokeCount,
                eraseCount: trace.eraseCount,
                bulkInsertCount: trace.bulkInsertCount,
                longestBulkInsertChars: trace.longestBulkInsertChars,
                rewriteSegments: trace.rewriteSegments,
                durationMs: trace.durationMs,
              })
              .onConflictDoNothing();
          }

          // Grade + AI/diachronic detection on every answer
          const answers = await db
            .select()
            .from(answersTable)
            .where(eq(answersTable.attemptId, attemptId));
          const byProblem = new Map(answers.map((x) => [x.problemId, x]));
          let score = 0;
          for (const p of problems) {
            const ans = byProblem.get(p.id);
            const ua = ans?.answer ?? "";
            const graded = await gradeAnswer({
              prompt: p.prompt,
              correctAnswer: p.correctAnswer,
              userAnswer: ua,
            });
            if (graded.correct) score += 1;
            if (ans && ua.trim().length > 0) {
              const det = await detect(ua, {
                keystrokeCount: ans.keystrokeCount,
                eraseCount: ans.eraseCount,
                bulkInsertCount: ans.bulkInsertCount,
                longestBulkInsertChars: ans.longestBulkInsertChars,
                rewriteSegments: ans.rewriteSegments,
                durationMs: ans.durationMs,
              });
              await db
                .update(answersTable)
                .set({
                  correct: graded.correct,
                  aiScore: det.aiScore,
                  aiFlagged: det.aiFlagged,
                  diachronicScore: det.diachronicScore,
                  diachronicFlagged: det.diachronicFlagged,
                  detectionRationale: det.rationale,
                })
                .where(eq(answersTable.id, ans.id));
            }
          }
          const pct = (score / problems.length) * 100;
          await db
            .update(attemptsTable)
            .set({
              status: "submitted",
              submittedAt: new Date(),
              scorePercent: pct,
            })
            .where(eq(attemptsTable.id, attemptId));
          return `submitted ${problems.length} answers · score ${pct.toFixed(0)}%`;
        },
      ),
    );
  }

  // Practice loop (adaptive + tutor)
  let sessionId: number | null = null;
  steps.push(
    await run("Start practice session (tutor on, focus on weaknesses)", async () => {
      const [s] = await db
        .insert(practiceSessionsTable)
        .values({
          weekNumber: null,
          topicId: null,
          tutorEnabled: true,
          focusOnWeaknesses: true,
          difficulty: 2.0,
        })
        .returning();
      if (!s) throw new Error("could not create session");
      sessionId = s.id;
      return `session #${s.id}`;
    }),
  );

  for (let i = 0; i < 2; i++) {
    steps.push(
      // eslint-disable-next-line no-loop-func
      await run(`Practice problem ${i + 1}: generate + grade + adapt`, async () => {
        if (!sessionId) throw new Error("no session");
        const topic = topics[Math.floor(Math.random() * topics.length)]!;
        const gen = await chatJson<{
          prompt: string;
          correctAnswer: string;
          explanation: string;
        }>(
          `You generate a single quantitative-reasoning practice problem on "${topic.title}" at easy difficulty. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string}.`,
          `New problem on ${topic.title}.`,
        );
        const [stored] = await db
          .insert(practiceProblemsTable)
          .values({
            sessionId,
            topicId: topic.id,
            prompt: gen.prompt,
            correctAnswer: gen.correctAnswer,
            explanation: gen.explanation,
            difficulty: 2.0,
          })
          .returning();
        if (!stored) throw new Error("could not store problem");
        const graded = await gradeAnswer({
          prompt: stored.prompt,
          correctAnswer: stored.correctAnswer,
          userAnswer: stored.correctAnswer,
        });
        await db.insert(practiceAttemptsTable).values({
          sessionId,
          problemId: stored.id,
          topicId: stored.topicId,
          answer: stored.correctAnswer,
          correct: graded.correct,
          difficulty: stored.difficulty,
          trace: syntheticTrace(stored.correctAnswer),
        });
        return `topic=${topic.title} · correct=${graded.correct}`;
      }),
    );
  }

  steps.push(
    await run("AI tutor: ask with lecture context", async () => {
      const ctx = (lectures[0]?.body ?? "").slice(0, 400);
      const txt = await chatText(
        "You are a concise tutor. Reply in 2 sentences.",
        `Context from a lecture:\n"""${ctx}"""\n\nStudent question: Can you summarize the key takeaway?`,
      );
      if (!txt) throw new Error("tutor returned nothing");
      return `${txt.length} chars`;
    }),
  );

  steps.push(
    await run("AI detection scan (pasted-style text should flag)", async () => {
      const r = await detect(
        "In conclusion, the multifaceted tapestry of quantitative reasoning is paramount to navigating the landscape of modern academic discourse.",
        {
          keystrokeCount: 8,
          eraseCount: 0,
          bulkInsertCount: 1,
          longestBulkInsertChars: 160,
          rewriteSegments: 0,
          durationMs: 1200,
        },
      );
      return `aiScore=${r.aiScore.toFixed(2)} (flagged=${r.aiFlagged}) · diachronic=${r.diachronicScore.toFixed(
        2,
      )} (flagged=${r.diachronicFlagged})`;
    }),
  );

  steps.push(
    await run("Analytics: summary + topics + activity", async () => {
      const submitted = await db
        .select()
        .from(attemptsTable)
        .where(eq(attemptsTable.status, "submitted"));
      const practice = await db.select().from(practiceAttemptsTable);
      const t = await db.select().from(topicsTable);
      return `${submitted.length} submitted attempts · ${practice.length} practice attempts · ${t.length} topics`;
    }),
  );

  steps.push(
    await run("Analytics report (LLM narrative)", async () => {
      const out = await chatJson<{ narrative: string; recommendations: string[] }>(
        "You are an academic advisor. Reply as strict JSON.",
        'Return {"narrative": "ok", "recommendations": ["a","b","c"]}.',
      );
      if (!out.narrative) throw new Error("no narrative");
      return `narrative ${out.narrative.length} chars · ${out.recommendations.length} recs`;
    }),
  );

  const ok = steps.every((s) => s.ok);
  res.json({ ok, generatedAt: new Date().toISOString(), steps });
});

// ---------- Expand lectures: generate medium / long versions with more examples ----------
router.post("/diagnostics/expand-lectures", async (req, res) => {
  const rawLevel = String(req.query.level ?? "");
  if (rawLevel !== "medium" && rawLevel !== "long") {
    res.status(400).json({ error: "level must be 'medium' or 'long'" });
    return;
  }
  const level: "medium" | "long" = rawLevel;

  const rawId = req.query.id;
  let onlyId: number | null = null;
  if (rawId !== undefined && rawId !== "") {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      res.status(400).json({ error: "id must be a positive integer" });
      return;
    }
    onlyId = parsed;
  }

  const all = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      body: lecturesTable.body,
      bodyMedium: lecturesTable.bodyMedium,
      bodyLong: lecturesTable.bodyLong,
    })
    .from(lecturesTable)
    .orderBy(asc(lecturesTable.id));
  const lectures = onlyId !== null ? all.filter((l) => l.id === onlyId) : all;
  if (onlyId !== null && lectures.length === 0) {
    res.status(404).json({ error: `no lecture with id ${onlyId}` });
    return;
  }

  const ratio = level === "long" ? "roughly 2x to 3x the length of the SHORT version" : "roughly 1.5x to 2x the length of the SHORT version";
  const moreExamples =
    level === "long"
      ? "At least TWO additional fully worked examples for every concept beyond what the short version has — pick contrasting cases (edge cases, common mistakes, larger numbers, real-world framings)."
      : "At least ONE additional fully worked example for every concept beyond what the short version has.";
  const moreExplanation =
    level === "long"
      ? "Considerably more explanation: motivate every rule, explain WHY it works, name common pitfalls, and add brief 'sanity check' notes after computations."
      : "Noticeably more explanation: clarify each definition, motivate each rule, and add a short 'why this works' note where useful.";

  const sys =
    `You are a college quantitative-reasoning lecturer producing the ${level.toUpperCase()} version of a lecture. ` +
    "You are given the SHORT version of the lecture. Rewrite it as a longer teaching version. RULES, no exceptions:\n" +
    "1. KEEP every heading and every concept from the SHORT version, in the same order, with the same names. You may add new sub-sections only when needed to introduce additional examples — but no new top-level topics.\n" +
    `2. ${moreExplanation}\n` +
    `3. ${moreExamples} Use \`## Example\` / \`### Example 1\`, \`### Example 2\` headings, with numbered steps. Inline math \`$...$\`, display math \`$$...$$\` (escape backslashes in LaTeX commands).\n` +
    `4. Length target: ${ratio}.\n` +
    "5. Friendly, plain English. No filler, no hedging, no 'in conclusion'. Examples carry the load.\n" +
    "6. Return ONLY the rewritten Markdown lecture body. No preface, no commentary, no code fences around the whole thing.";

  let updated = 0;
  let failed = 0;
  const concurrency = 3;
  for (let i = 0; i < lectures.length; i += concurrency) {
    const batch = lectures.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (l) => {
        try {
          const user = `LECTURE TITLE: ${l.title}\n\nSHORT VERSION:\n"""\n${l.body}\n"""`;
          const expanded = await chatText(sys, user);
          if (!expanded || expanded.trim().length < l.body.length * 0.85) {
            failed++;
            return;
          }
          const patch =
            level === "long"
              ? { bodyLong: expanded.trim() }
              : { bodyMedium: expanded.trim() };
          await db.update(lecturesTable).set(patch).where(eq(lecturesTable.id, l.id));
          updated++;
        } catch {
          failed++;
        }
      }),
    );
  }

  res.json({ ok: failed === 0, level, updated, failed, total: lectures.length });
});

// ---------- Reset: wipe all student progress, keep course content ----------
router.post("/diagnostics/reset", async (_req, res) => {
  // Delete in dependency order. Course content (topics, lectures, assignments,
  // problems) is preserved; only student progress / generated practice is wiped.
  await db.delete(practiceAttemptsTable);
  await db.delete(practiceProblemsTable);
  await db.delete(practiceSessionsTable);
  await db.delete(assessmentProblemsTable);
  await db.delete(assessmentInstancesTable);
  await db.delete(answersTable);
  await db.delete(attemptsTable);
  res.json({ ok: true, resetAt: new Date().toISOString() });
});

export default router;
