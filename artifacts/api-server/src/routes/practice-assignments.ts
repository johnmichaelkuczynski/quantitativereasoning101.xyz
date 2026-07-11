import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  problemsTable,
  topicsTable,
  practiceAssignmentsTable,
  practiceAssignmentProblemsTable,
  practiceFeedbackMessagesTable,
} from "@workspace/db";
import {
  GeneratePracticeAssignmentBody,
  GeneratePracticeAssignmentResponse,
  GetPracticeAssignmentResponse,
  SavePracticeAssignmentAnswerBody,
  SubmitPracticeAssignmentResponse,
  GetPracticeAssignmentResultResponse,
  PracticeFeedbackChatBody,
  GetPracticeFeedbackMessagesResponse,
  GetPracticeAssignmentHistoryResponse,
} from "@workspace/api-zod";
import { chatJson, chatText } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";
import { recordTopicOutcome, getTopicMastery } from "../lib/profile";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

/** Normalize a prompt so near-duplicates collide on comparison. */
function normalizePrompt(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type FocusReport = {
  summary: string;
  readiness: number;
  pointers: Array<{
    topicTitle: string;
    issue: string;
    action: string;
    masteryPercent: number | null;
  }>;
  encouragement: string;
};

router.post("/practice-assignments/generate", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = GeneratePracticeAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sourceAssignmentId } = parsed.data;

  const [source] = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, sourceAssignmentId));
  if (!source) {
    res.status(404).json({ error: "source assignment not found" });
    return;
  }

  const sourceProblems = await db
    .select({
      id: problemsTable.id,
      position: problemsTable.position,
      prompt: problemsTable.prompt,
      topicId: problemsTable.topicId,
      topicTitle: topicsTable.title,
    })
    .from(problemsTable)
    .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(problemsTable.assignmentId, sourceAssignmentId))
    .orderBy(asc(problemsTable.position));

  if (sourceProblems.length === 0) {
    res.status(400).json({ error: "source assignment has no problems" });
    return;
  }

  // Build the exclusion set: every real graded prompt for this assignment, plus
  // every practice prompt ever generated for it. Nothing repeats, nothing overlaps
  // the graded version.
  const gradedPrompts = sourceProblems.map((p) => p.prompt);
  const priorPracticeRows = await db
    .select({ prompt: practiceAssignmentProblemsTable.prompt })
    .from(practiceAssignmentProblemsTable)
    .innerJoin(
      practiceAssignmentsTable,
      eq(practiceAssignmentProblemsTable.practiceAssignmentId, practiceAssignmentsTable.id),
    )
    .where(
      and(
        eq(practiceAssignmentsTable.sourceAssignmentId, sourceAssignmentId),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  const priorPracticePrompts = priorPracticeRows.map((r) => r.prompt);

  const [created] = await db
    .insert(practiceAssignmentsTable)
    .values({
      userId,
      sourceAssignmentId,
      kind: source.kind,
      title: `Practice — ${source.title}`,
      weekNumber: source.weekNumber,
      status: "in_progress",
    })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed to create practice assignment" });
    return;
  }

  const batchGenerated: string[] = [];
  const toInsert: Array<{
    practiceAssignmentId: number;
    topicId: number;
    position: number;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint: string | null;
  }> = [];

  // Normalized set of everything the new problems must NOT duplicate: every graded
  // prompt, every prior practice prompt, and (as we go) every problem in this batch.
  const excludeNorm = new Set<string>(
    [...gradedPrompts, ...priorPracticePrompts].map(normalizePrompt),
  );

  for (const sp of sourceProblems) {
    type Gen = {
      prompt: string;
      correctAnswer: string;
      explanation: string;
      hint?: string;
    };
    let gen: Gen | null = null;

    // Try the model a few times; reject any candidate that collides (normalized)
    // with the exclude set so practice never repeats or overlaps the graded version.
    for (let attempt = 0; attempt < 3 && !gen; attempt++) {
      const exclude = [...gradedPrompts, ...priorPracticePrompts, ...batchGenerated];
      try {
        const candidate = await chatJson<Gen>(
          `You write ONE brand-new quantitative-reasoning practice problem for a college freshman, on the topic "${
            sp.topicTitle ?? "quantitative reasoning"
          }". It must test the SAME skill and be at the SAME difficulty as this reference graded problem, but use DIFFERENT numbers, context, and wording:\n"""\n${
            sp.prompt
          }\n"""\nHard rules: (1) The problem must NOT be a paraphrase of, and must NOT share the same numbers/answer as, any prompt in the EXCLUDE list. (2) Use $...$ for inline LaTeX where helpful. (3) correctAnswer must be a short string (a number, fraction, expression, or short word) — never multi-paragraph. (4) explanation is a concise worked solution. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string, "hint": string}.`,
          `EXCLUDE (do not duplicate or paraphrase any of these): ${JSON.stringify(
            exclude,
          )}\n\nGenerate the new problem now.`,
        );
        if (candidate?.prompt && !excludeNorm.has(normalizePrompt(candidate.prompt))) {
          gen = candidate;
        }
      } catch {
        break;
      }
    }

    if (!gen) {
      // Guaranteed-unique randomized fallback so repeated LLM failures never
      // produce the same problem twice.
      let fallback: Gen;
      do {
        const a = 2 + Math.floor(Math.random() * 9);
        const x = 1 + Math.floor(Math.random() * 12);
        const b = 1 + Math.floor(Math.random() * 40);
        const c = a * x + b;
        fallback = {
          prompt: `Practice (${sp.topicTitle ?? "QR"}): If $${a}x + ${b} = ${c}$, solve for $x$.`,
          correctAnswer: String(x),
          explanation: `Subtract ${b} from both sides to get $${a}x = ${
            c - b
          }$, then divide by ${a} to get $x = ${x}$.`,
          hint: "Isolate the variable term first, then divide by its coefficient.",
        };
      } while (excludeNorm.has(normalizePrompt(fallback.prompt)));
      gen = fallback;
    }

    excludeNorm.add(normalizePrompt(gen.prompt));
    batchGenerated.push(gen.prompt);
    toInsert.push({
      practiceAssignmentId: created.id,
      topicId: sp.topicId,
      position: sp.position,
      prompt: gen.prompt,
      correctAnswer: gen.correctAnswer,
      explanation: gen.explanation,
      hint: gen.hint ?? null,
    });
  }

  await db.insert(practiceAssignmentProblemsTable).values(toInsert);

  const stored = await db
    .select({
      id: practiceAssignmentProblemsTable.id,
      position: practiceAssignmentProblemsTable.position,
      prompt: practiceAssignmentProblemsTable.prompt,
      topicId: practiceAssignmentProblemsTable.topicId,
      topicTitle: topicsTable.title,
      hint: practiceAssignmentProblemsTable.hint,
    })
    .from(practiceAssignmentProblemsTable)
    .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
    .where(eq(practiceAssignmentProblemsTable.practiceAssignmentId, created.id))
    .orderBy(asc(practiceAssignmentProblemsTable.position));

  res.json(
    GeneratePracticeAssignmentResponse.parse({
      id: created.id,
      sourceAssignmentId,
      kind: created.kind as "homework" | "test" | "midterm" | "final",
      title: created.title,
      weekNumber: created.weekNumber,
      status: created.status as "in_progress" | "submitted",
      problems: stored,
    }),
  );
});

router.get("/practice-assignments/:id", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [pa] = await db
    .select()
    .from(practiceAssignmentsTable)
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  if (!pa) {
    res.status(404).json({ error: "practice assignment not found" });
    return;
  }
  const problems = await db
    .select({
      id: practiceAssignmentProblemsTable.id,
      position: practiceAssignmentProblemsTable.position,
      prompt: practiceAssignmentProblemsTable.prompt,
      topicId: practiceAssignmentProblemsTable.topicId,
      topicTitle: topicsTable.title,
      hint: practiceAssignmentProblemsTable.hint,
    })
    .from(practiceAssignmentProblemsTable)
    .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
    .where(eq(practiceAssignmentProblemsTable.practiceAssignmentId, id))
    .orderBy(asc(practiceAssignmentProblemsTable.position));

  res.json(
    GetPracticeAssignmentResponse.parse({
      id: pa.id,
      sourceAssignmentId: pa.sourceAssignmentId,
      kind: pa.kind as "homework" | "test" | "midterm" | "final",
      title: pa.title,
      weekNumber: pa.weekNumber,
      status: pa.status as "in_progress" | "submitted",
      problems,
    }),
  );
});

router.put("/practice-assignments/:id/answer", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SavePracticeAssignmentAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;

  const [pa] = await db
    .select()
    .from(practiceAssignmentsTable)
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  if (!pa) {
    res.status(404).json({ error: "practice assignment not found" });
    return;
  }
  if (pa.status !== "in_progress") {
    res.status(400).json({ error: "practice assignment already submitted" });
    return;
  }

  const upd = await db
    .update(practiceAssignmentProblemsTable)
    .set({
      answer,
      keystrokeCount: trace.keystrokeCount,
      eraseCount: trace.eraseCount,
      durationMs: trace.durationMs,
    })
    .where(
      and(
        eq(practiceAssignmentProblemsTable.id, problemId),
        eq(practiceAssignmentProblemsTable.practiceAssignmentId, id),
      ),
    );

  if ((upd.rowCount ?? 0) === 0) {
    res.status(404).json({ error: "problem not found in this practice assignment" });
    return;
  }

  res.json({ ok: true });
});

router.post("/practice-assignments/:id/submit", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [pa] = await db
    .select()
    .from(practiceAssignmentsTable)
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  if (!pa) {
    res.status(404).json({ error: "practice assignment not found" });
    return;
  }
  if (pa.status !== "in_progress") {
    res.status(400).json({ error: "practice assignment already submitted" });
    return;
  }

  const problems = await db
    .select({
      id: practiceAssignmentProblemsTable.id,
      position: practiceAssignmentProblemsTable.position,
      prompt: practiceAssignmentProblemsTable.prompt,
      correctAnswer: practiceAssignmentProblemsTable.correctAnswer,
      explanation: practiceAssignmentProblemsTable.explanation,
      answer: practiceAssignmentProblemsTable.answer,
      topicId: practiceAssignmentProblemsTable.topicId,
      topicTitle: topicsTable.title,
    })
    .from(practiceAssignmentProblemsTable)
    .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
    .where(eq(practiceAssignmentProblemsTable.practiceAssignmentId, id))
    .orderBy(asc(practiceAssignmentProblemsTable.position));

  type Graded = {
    problemId: number;
    position: number;
    prompt: string;
    topicId: number;
    topicTitle: string | null;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
  };
  const graded: Graded[] = [];
  let score = 0;
  for (const p of problems) {
    const userAnswer = p.answer ?? "";
    const g = await gradeAnswer({
      prompt: p.prompt,
      correctAnswer: p.correctAnswer,
      userAnswer,
    });
    if (g.correct) score += 1;
    await recordTopicOutcome(userId, p.topicId, g.correct);
    graded.push({
      problemId: p.id,
      position: p.position,
      prompt: p.prompt,
      topicId: p.topicId,
      topicTitle: p.topicTitle ?? null,
      correct: g.correct,
      userAnswer,
      correctAnswer: p.correctAnswer,
      explanation: g.explanation || p.explanation,
    });
  }

  // Heavy per-problem feedback (batched).
  const feedbackByPosition = new Map<number, string>();
  try {
    const out = await chatJson<{ items: Array<{ position: number; feedback: string }> }>(
      'You are a generous, specific QR tutor giving practice feedback (this is NOT graded, so be thorough and warm). For each problem return 3-5 sentences that: name the exact concept being tested, diagnose precisely what the student did right or wrong from their answer, and show the concrete step they should take next time. Use $...$ for inline math. Strict JSON: {"items":[{"position": number, "feedback": string}]}.',
      JSON.stringify(
        graded.map((g) => ({
          position: g.position,
          topic: g.topicTitle,
          prompt: g.prompt,
          correctAnswer: g.correctAnswer,
          studentAnswer: g.userAnswer || "(left blank)",
          correct: g.correct,
        })),
      ),
    );
    for (const it of out.items ?? []) {
      if (typeof it.position === "number" && typeof it.feedback === "string") {
        feedbackByPosition.set(it.position, it.feedback);
      }
    }
  } catch {
    // fall through to explanation-based feedback
  }

  const perProblem = graded.map((g) => {
    const feedback =
      feedbackByPosition.get(g.position) ??
      (g.correct
        ? `Correct. ${g.explanation}`
        : `Not quite. The right answer is ${g.correctAnswer}. ${g.explanation}`);
    return {
      problemId: g.problemId,
      position: g.position,
      prompt: g.prompt,
      topicTitle: g.topicTitle,
      correct: g.correct,
      userAnswer: g.userAnswer,
      correctAnswer: g.correctAnswer,
      explanation: g.explanation,
      feedback,
    };
  });

  // Persist per-problem grading + feedback.
  for (const pp of perProblem) {
    await db
      .update(practiceAssignmentProblemsTable)
      .set({ correct: pp.correct, feedback: pp.feedback })
      .where(eq(practiceAssignmentProblemsTable.id, pp.problemId));
  }

  const total = problems.length;
  const percent = total === 0 ? 0 : (score / total) * 100;

  // Surgically precise focus report: cross-reference this attempt's misses with
  // the evolving per-topic mastery profile.
  const mastery = await getTopicMastery(userId);
  const missTopics = new Map<string, { topicId: number; misses: number; total: number }>();
  for (const g of graded) {
    const key = g.topicTitle ?? `Topic ${g.topicId}`;
    const e = missTopics.get(key) ?? { topicId: g.topicId, misses: 0, total: 0 };
    e.total += 1;
    if (!g.correct) e.misses += 1;
    missTopics.set(key, e);
  }
  const topicSignal = [...missTopics.entries()].map(([title, v]) => {
    const m = mastery.get(v.topicId);
    return {
      topicTitle: title,
      missedThisAttempt: v.misses,
      ofThisAttempt: v.total,
      masteryPercent: m ? Math.round(m.emaAccuracy * 100) : null,
      lifetimeAttempts: m?.attempts ?? 0,
    };
  });

  let focusReport: FocusReport;
  try {
    const out = await chatJson<FocusReport>(
      'You are an academic advisor for a college QR course. The student just finished a PRACTICE attempt (ungraded) of an assignment, so they can still improve before the real graded version. Using their per-topic results this attempt AND their evolving mastery profile, write a focus report. Be surgically specific: pointers must name the exact topic and the exact next action (e.g. "redo 5 proportion word-problems setting up the ratio before cross-multiplying"). Order pointers worst-first. readiness is 0-100 (how ready they are for the graded version). Strict JSON: {"summary": string, "readiness": number, "pointers":[{"topicTitle": string, "issue": string, "action": string, "masteryPercent": number}], "encouragement": string}.',
      JSON.stringify({
        scorePercent: Math.round(percent),
        perTopic: topicSignal,
      }),
    );
    focusReport = {
      summary: String(out.summary ?? ""),
      readiness:
        typeof out.readiness === "number"
          ? Math.max(0, Math.min(100, out.readiness))
          : Math.round(percent),
      pointers: Array.isArray(out.pointers)
        ? out.pointers.map((p) => ({
            topicTitle: String(p.topicTitle ?? ""),
            issue: String(p.issue ?? ""),
            action: String(p.action ?? ""),
            masteryPercent:
              typeof p.masteryPercent === "number" ? p.masteryPercent : null,
          }))
        : [],
      encouragement: String(out.encouragement ?? ""),
    };
  } catch {
    const weak = topicSignal
      .filter((t) => t.missedThisAttempt > 0)
      .sort((a, b) => b.missedThisAttempt - a.missedThisAttempt);
    focusReport = {
      summary: `You scored ${Math.round(percent)}% on this practice attempt. ${
        weak.length === 0
          ? "No weak spots stood out — you're tracking well."
          : `The topics that need the most work: ${weak.map((w) => w.topicTitle).join(", ")}.`
      }`,
      readiness: Math.round(percent),
      pointers: weak.map((w) => ({
        topicTitle: w.topicTitle,
        issue: `Missed ${w.missedThisAttempt} of ${w.ofThisAttempt} ${w.topicTitle} problems this attempt.`,
        action: `Run a focused practice round on ${w.topicTitle} before the graded version.`,
        masteryPercent: w.masteryPercent,
      })),
      encouragement:
        "Practice is where the learning happens — generate another set and keep going before you risk the graded one.",
    };
  }

  await db
    .update(practiceAssignmentsTable)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      scorePercent: percent,
      focusReport,
    })
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );

  res.json(
    SubmitPracticeAssignmentResponse.parse({
      id,
      score,
      total,
      percent,
      perProblem,
      focusReport,
    }),
  );
});

router.get("/practice-assignments/:id/result", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [pa] = await db
    .select()
    .from(practiceAssignmentsTable)
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  if (!pa || pa.status !== "submitted") {
    res.status(404).json({ error: "no submitted result for this practice assignment" });
    return;
  }
  const problems = await db
    .select({
      id: practiceAssignmentProblemsTable.id,
      position: practiceAssignmentProblemsTable.position,
      prompt: practiceAssignmentProblemsTable.prompt,
      correctAnswer: practiceAssignmentProblemsTable.correctAnswer,
      explanation: practiceAssignmentProblemsTable.explanation,
      answer: practiceAssignmentProblemsTable.answer,
      correct: practiceAssignmentProblemsTable.correct,
      feedback: practiceAssignmentProblemsTable.feedback,
      topicTitle: topicsTable.title,
    })
    .from(practiceAssignmentProblemsTable)
    .leftJoin(topicsTable, eq(practiceAssignmentProblemsTable.topicId, topicsTable.id))
    .where(eq(practiceAssignmentProblemsTable.practiceAssignmentId, id))
    .orderBy(asc(practiceAssignmentProblemsTable.position));

  const total = problems.length;
  const score = problems.filter((p) => p.correct).length;
  const percent = pa.scorePercent ?? (total === 0 ? 0 : (score / total) * 100);

  res.json(
    GetPracticeAssignmentResultResponse.parse({
      id,
      score,
      total,
      percent,
      perProblem: problems.map((p) => ({
        problemId: p.id,
        position: p.position,
        prompt: p.prompt,
        topicTitle: p.topicTitle ?? null,
        correct: !!p.correct,
        userAnswer: p.answer,
        correctAnswer: p.correctAnswer,
        explanation: p.explanation,
        feedback: p.feedback ?? p.explanation,
      })),
      focusReport: (pa.focusReport as FocusReport) ?? {
        summary: "",
        readiness: percent,
        pointers: [],
        encouragement: "",
      },
    }),
  );
});

router.post(
  "/practice-assignments/:id/feedback-chat",
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const id = parseIdParam(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = PracticeFeedbackChatBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { message, problemId } = parsed.data;

    const [pa] = await db
      .select()
      .from(practiceAssignmentsTable)
      .where(
        and(
          eq(practiceAssignmentsTable.id, id),
          eq(practiceAssignmentsTable.userId, userId),
        ),
      );
    if (!pa) {
      res.status(404).json({ error: "practice assignment not found" });
      return;
    }

    const problems = await db
      .select()
      .from(practiceAssignmentProblemsTable)
      .where(eq(practiceAssignmentProblemsTable.practiceAssignmentId, id))
      .orderBy(asc(practiceAssignmentProblemsTable.position));

    const scoped =
      problemId != null ? problems.find((p) => p.id === problemId) ?? null : null;

    const priorMsgs = await db
      .select()
      .from(practiceFeedbackMessagesTable)
      .where(eq(practiceFeedbackMessagesTable.practiceAssignmentId, id))
      .orderBy(asc(practiceFeedbackMessagesTable.id));

    const report = pa.focusReport as FocusReport | null;
    const contextLines: string[] = [
      `This is a dialogue about the student's PRACTICE attempt of "${pa.title}".`,
      `Overall score: ${
        pa.scorePercent != null ? Math.round(pa.scorePercent) + "%" : "n/a"
      }.`,
    ];
    if (report?.summary) contextLines.push(`Focus summary: ${report.summary}`);
    if (scoped) {
      contextLines.push(
        `The student is asking specifically about this problem:\nPROMPT: ${scoped.prompt}\nCORRECT ANSWER: ${scoped.correctAnswer}\nTHEIR ANSWER: ${
          scoped.answer || "(blank)"
        }\nFEEDBACK GIVEN: ${scoped.feedback ?? scoped.explanation}`,
      );
    } else {
      contextLines.push(
        `Per-problem feedback already given:\n${problems
          .map(
            (p) =>
              `#${p.position} (${p.correct ? "correct" : "wrong"}): ${
                p.feedback ?? p.explanation
              }`,
          )
          .join("\n")}`,
      );
    }
    const history = priorMsgs
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n");

    const sys =
      "You are the student's QR tutor, continuing a conversation about feedback on a practice attempt. Be concrete, use $...$ for math, reference their actual answers, and keep replies focused (3-6 sentences unless they ask for more). Help them understand, don't just restate.";
    const user = `${contextLines.join("\n")}\n\n${
      history ? `Conversation so far:\n${history}\n\n` : ""
    }Student: ${message}`;

    let reply = "";
    try {
      reply = await chatText(sys, user);
    } catch {
      reply =
        "I'm having trouble reaching the tutor right now — try again in a moment.";
    }

    await db.insert(practiceFeedbackMessagesTable).values([
      { practiceAssignmentId: id, problemId: problemId ?? null, role: "user", content: message },
      { practiceAssignmentId: id, problemId: problemId ?? null, role: "assistant", content: reply },
    ]);

    res.json({ reply });
  },
);

router.get("/practice-assignments/:id/messages", async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [pa] = await db
    .select()
    .from(practiceAssignmentsTable)
    .where(
      and(
        eq(practiceAssignmentsTable.id, id),
        eq(practiceAssignmentsTable.userId, userId),
      ),
    );
  if (!pa) {
    res.status(404).json({ error: "practice assignment not found" });
    return;
  }
  const rows = await db
    .select()
    .from(practiceFeedbackMessagesTable)
    .where(eq(practiceFeedbackMessagesTable.practiceAssignmentId, id))
    .orderBy(asc(practiceFeedbackMessagesTable.id));
  res.json(
    GetPracticeFeedbackMessagesResponse.parse(
      rows.map((m) => ({
        id: m.id,
        problemId: m.problemId,
        role: m.role as "user" | "assistant",
        content: m.content,
        at: m.createdAt.toISOString(),
      })),
    ),
  );
});

router.get(
  "/practice-assignments/history/:sourceAssignmentId",
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const sourceId = parseIdParam(req.params.sourceAssignmentId);
    if (!Number.isFinite(sourceId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const rows = await db
      .select({
        id: practiceAssignmentsTable.id,
        percent: practiceAssignmentsTable.scorePercent,
        submittedAt: practiceAssignmentsTable.submittedAt,
      })
      .from(practiceAssignmentsTable)
      .where(
        and(
          eq(practiceAssignmentsTable.sourceAssignmentId, sourceId),
          eq(practiceAssignmentsTable.status, "submitted"),
          eq(practiceAssignmentsTable.userId, userId),
        ),
      )
      .orderBy(desc(practiceAssignmentsTable.id));

    const percents = rows
      .map((r) => r.percent)
      .filter((p): p is number => typeof p === "number");
    const bestPercent = percents.length ? Math.max(...percents) : null;
    const lastPercent = rows[0]?.percent ?? null;

    // Readiness: blend recent practice performance with how much practice they've
    // done (need at least a couple of attempts to be "ready").
    const recent = percents.slice(0, 3);
    const recentAvg = recent.length
      ? recent.reduce((s, p) => s + p, 0) / recent.length
      : 0;
    const volumeFactor = Math.min(1, rows.length / 2);
    const readiness = Math.round(recentAvg * (0.6 + 0.4 * volumeFactor));

    res.json(
      GetPracticeAssignmentHistoryResponse.parse({
        attempts: rows.length,
        bestPercent,
        lastPercent,
        readiness,
        items: rows.map((r) => ({
          id: r.id,
          percent: r.percent,
          submittedAt: r.submittedAt?.toISOString() ?? null,
        })),
      }),
    );
  },
);

export default router;
