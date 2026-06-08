import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  assignmentsTable,
  problemsTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
} from "@workspace/db";
import {
  StartPracticeSessionBody,
  StartPracticeSessionResponse,
  NextPracticeProblemBody,
  NextPracticeProblemResponse,
  GradePracticeAnswerBody,
  GradePracticeAnswerResponse,
  GenerateAssignmentPracticeResponse,
  GradePracticeWithFeedbackBody,
  GradePracticeWithFeedbackResponse,
  DiscussPracticeProblemBody,
  DiscussPracticeProblemResponse,
} from "@workspace/api-zod";
import { chatJson, chatText } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

async function pickTopicId(
  weekNumber: number | null | undefined,
  preferred: number | null | undefined,
  focusOnWeaknesses: boolean,
): Promise<{ id: number; title: string; weekNumber: number }> {
  if (preferred != null) {
    const [t] = await db.select().from(topicsTable).where(eq(topicsTable.id, preferred));
    if (t) return { id: t.id, title: t.title, weekNumber: t.weekNumber };
  }
  const candidates = weekNumber
    ? await db.select().from(topicsTable).where(eq(topicsTable.weekNumber, weekNumber))
    : await db.select().from(topicsTable);

  if (focusOnWeaknesses) {
    const stats = await db.execute(sql`
      select topic_id, count(*)::int as n, avg(case when correct then 1.0 else 0.0 end) as acc
      from practice_attempts group by topic_id
    `);
    const byId = new Map<number, { n: number; acc: number }>();
    for (const r of stats.rows as Array<{ topic_id: number; n: number; acc: number }>) {
      byId.set(Number(r.topic_id), { n: Number(r.n), acc: Number(r.acc) });
    }
    // weight = (1 - accuracy) + small bonus for low-attempted topics
    const scored = candidates.map((t) => {
      const s = byId.get(t.id);
      const acc = s?.acc ?? 0.5;
      const n = s?.n ?? 0;
      const weight = (1 - acc) * 2 + (n < 3 ? 1 : 0) + Math.random() * 0.3;
      return { t, weight };
    });
    scored.sort((a, b) => b.weight - a.weight);
    const choice = scored[0]?.t ?? candidates[Math.floor(Math.random() * candidates.length)]!;
    return { id: choice.id, title: choice.title, weekNumber: choice.weekNumber };
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)]!;
  return { id: choice.id, title: choice.title, weekNumber: choice.weekNumber };
}

router.post("/practice/sessions", async (req, res): Promise<void> => {
  const parsed = StartPracticeSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { weekNumber, topicId, tutorEnabled, focusOnWeaknesses, initialDifficulty } =
    parsed.data;
  const startDifficulty =
    typeof initialDifficulty === "number" && !Number.isNaN(initialDifficulty)
      ? Math.max(1, Math.min(5, initialDifficulty))
      : 2.0;
  const [created] = await db
    .insert(practiceSessionsTable)
    .values({
      weekNumber: weekNumber ?? null,
      topicId: topicId ?? null,
      tutorEnabled,
      focusOnWeaknesses: focusOnWeaknesses ?? true,
      difficulty: startDifficulty,
    })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed" });
    return;
  }
  res.json(
    StartPracticeSessionResponse.parse({
      id: created.id,
      tutorEnabled: created.tutorEnabled,
      difficulty: created.difficulty,
      weekNumber: created.weekNumber,
      topicId: created.topicId,
      focusOnWeaknesses: created.focusOnWeaknesses,
    }),
  );
});

router.post("/practice/sessions/:sessionId/next", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = NextPracticeProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }

  const topic = await pickTopicId(
    session.weekNumber,
    parsed.data.topicId ?? session.topicId,
    session.focusOnWeaknesses,
  );

  const lastProblems = await db
    .select({ prompt: practiceProblemsTable.prompt })
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.sessionId, sessionId),
        eq(practiceProblemsTable.topicId, topic.id),
      ),
    )
    .orderBy(desc(practiceProblemsTable.id))
    .limit(3);

  const difficulty = Math.max(1, Math.min(5, session.difficulty));
  const difficultyLabel =
    difficulty <= 1.7
      ? "very easy"
      : difficulty <= 2.5
      ? "easy"
      : difficulty <= 3.3
      ? "medium"
      : difficulty <= 4.1
      ? "hard"
      : "challenging";

  const userRequest = parsed.data.request?.trim() || "";
  let generated: { prompt: string; correctAnswer: string; explanation: string };
  try {
    generated = await chatJson<{
      prompt: string;
      correctAnswer: string;
      explanation: string;
    }>(
      `You generate a single college ethics practice problem for a college freshman. The problem MUST be on the topic "${topic.title}" and at difficulty "${difficultyLabel}" (${difficulty.toFixed(
        1,
      )}/5). HARD RULES: (1) The prompt MUST open with a SPECIFIC, concrete SCENARIO or SITUATION (named people, a dilemma, a case) and then ask the student to APPLY the concept to it — judge it, decide what to do, or diagnose the reasoning. (2) NEVER ask the student to define a term, "explain the difference", "state the principle", or recite a concept in the abstract. (3) The answer MUST require substantive, multi-sentence reasoning — never a single word, term, "yes"/"no", true/false, or fill-in-the-blank. (4) The scenario MUST be SELF-CONTAINED and answerable by anyone who understands the concept — NEVER reference the textbook's or lecture's own examples, named cases, characters, or specific passages (do NOT say things like "the rabbit", "the example from the reading", "as in the text", "the case we discussed"). Invent a brand-new everyday situation; the student must NOT need to have read any particular passage to answer. Higher difficulty = a more tangled scenario with competing considerations, not a harder vocabulary word. Provide a rich model answer of 3-5 sentences that works the scenario. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string} where explanation is a one-sentence summary of the key point. Do NOT reuse these recent scenarios: ${JSON.stringify(
        lastProblems.map((p) => p.prompt),
      )}.`,
      userRequest || `Generate a new ${difficultyLabel} scenario-based problem on ${topic.title}.`,
    );
  } catch {
    generated = {
      prompt: `Practice (${topic.title}): Imagine a real situation in which two people disagree about how "${topic.title}" applies. Describe the situation briefly, then argue which side gets it right and why, using the concept.`,
      correctAnswer:
        "A worked-through scenario that applies the concept to take a defensible side, with reasons drawn from the topic.",
      explanation: "Re-read the lecture for this topic, then apply its central claim to a concrete case.",
    };
  }

  const [stored] = await db
    .insert(practiceProblemsTable)
    .values({
      sessionId,
      topicId: topic.id,
      prompt: generated.prompt,
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
      difficulty,
    })
    .returning();
  if (!stored) {
    res.status(500).json({ error: "failed" });
    return;
  }

  res.json(
    NextPracticeProblemResponse.parse({
      id: stored.id,
      prompt: stored.prompt,
      topicId: topic.id,
      topicTitle: topic.title,
      difficulty,
    }),
  );
});

router.post("/practice/sessions/:sessionId/grade", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = GradePracticeAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  const [problem] = await db
    .select()
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.id, problemId),
        eq(practiceProblemsTable.sessionId, sessionId),
      ),
    );
  if (!problem) {
    res.status(404).json({ error: "problem not found in this session" });
    return;
  }

  const graded = await gradeAnswer({
    prompt: problem.prompt,
    correctAnswer: problem.correctAnswer,
    userAnswer: answer,
  });

  await db.insert(practiceAttemptsTable).values({
    sessionId,
    problemId,
    topicId: problem.topicId,
    answer,
    correct: graded.correct,
    difficulty: problem.difficulty,
    trace,
  });

  const delta = graded.correct ? 0.4 : -0.5;
  const newDifficulty = Math.max(1, Math.min(5, session.difficulty + delta));
  await db
    .update(practiceSessionsTable)
    .set({ difficulty: newDifficulty })
    .where(eq(practiceSessionsTable.id, sessionId));

  let tutorTip: string | null = null;
  if (session.tutorEnabled && !graded.correct) {
    try {
      tutorTip = (
        await chatJson<{ tip: string }>(
          "You are a kind, concise ethics tutor. Given a problem, the correct answer, and the student's wrong attempt, give ONE focused next-step tip (2 sentences max). Respond as strict JSON: {\"tip\": string}.",
          JSON.stringify({
            prompt: problem.prompt,
            correctAnswer: problem.correctAnswer,
            studentAnswer: answer,
          }),
        )
      ).tip;
    } catch {
      tutorTip = null;
    }
  }

  res.json(
    GradePracticeAnswerResponse.parse({
      problemId,
      correct: graded.correct,
      correctAnswer: problem.correctAnswer,
      explanation: graded.explanation || problem.explanation,
      newDifficulty,
      tutorTip,
    }),
  );
});

// ---------- Assignment practice: infinitely-regenerable set mirroring a graded assignment ----------
router.post("/assignments/:assignmentId/practice", async (req, res): Promise<void> => {
  const assignmentId = parseIdParam(req.params.assignmentId);
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

  // Source problems define the topics + style to mirror.
  const sourceProblems = await db
    .select({
      prompt: problemsTable.prompt,
      correctAnswer: problemsTable.correctAnswer,
      topicId: problemsTable.topicId,
      topicTitle: topicsTable.title,
    })
    .from(problemsTable)
    .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(problemsTable.assignmentId, assignmentId))
    .orderBy(asc(problemsTable.position));

  if (sourceProblems.length === 0) {
    res.status(404).json({ error: "assignment has no problems" });
    return;
  }

  // A fresh session each time => infinite regeneration of distinct sets.
  const [session] = await db
    .insert(practiceSessionsTable)
    .values({
      weekNumber: assignment.weekNumber,
      topicId: null,
      tutorEnabled: true,
      focusOnWeaknesses: false,
      difficulty: 3.0,
    })
    .returning();
  if (!session) {
    res.status(500).json({ error: "failed to create session" });
    return;
  }

  // Every graded prompt for this assignment is OFF-LIMITS for practice (no overlap with the real thing).
  const gradedPrompts = sourceProblems.map((s) => s.prompt);

  // Recently-generated practice prompts per topic (across prior practice sessions) — avoid repeats.
  const recentPracticeRows = await db
    .select({ topicId: practiceProblemsTable.topicId, prompt: practiceProblemsTable.prompt })
    .from(practiceProblemsTable)
    .orderBy(desc(practiceProblemsTable.id))
    .limit(200);
  const recentByTopic = new Map<number, string[]>();
  for (const r of recentPracticeRows) {
    const list = recentByTopic.get(r.topicId) ?? [];
    if (list.length < 6) list.push(r.prompt);
    recentByTopic.set(r.topicId, list);
  }

  // Hard, deterministic no-repeat enforcement: nothing identical to a graded prompt,
  // to a recently-generated practice prompt, or to a sibling in THIS set.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const used = new Set<string>();
  for (const g of gradedPrompts) used.add(norm(g));
  for (const list of recentByTopic.values()) for (const p of list) used.add(norm(p));

  // Varied fallback scenarios so repeated topics never collapse to identical generic prompts.
  const fallbackAngles = [
    "a coworker making a decision under pressure",
    "two friends arguing over the right call",
    "a public official defending a controversial choice",
    "a student facing a dilemma with no easy answer",
    "a family weighing what they owe one another",
    "a stranger whose situation forces a hard judgment",
  ];
  function fallbackFor(topicTitle: string, idx: number) {
    const angle = fallbackAngles[idx % fallbackAngles.length];
    return {
      prompt: `Invent a brief, concrete situation involving ${angle} where "${topicTitle}" is exactly the idea in play. Describe the situation in a sentence or two, then work through what the concept says they should conclude or do, and why — case ${idx + 1}.`,
      correctAnswer: `A worked-through scenario that applies the core idea of ${topicTitle} to reach a defensible conclusion, giving reasons grounded in the concept rather than restating its definition.`,
      explanation: `Re-read the lecture on ${topicTitle}, then apply its central claim to a concrete case.`,
    };
  }

  // Generate sequentially so each new problem can avoid every prompt already produced in this set.
  const generated: Array<{ stored: typeof practiceProblemsTable.$inferSelect; topicTitle: string }> =
    [];
  for (let i = 0; i < sourceProblems.length; i++) {
    const src = sourceProblems[i]!;
    const topicTitle = src.topicTitle ?? "this topic";

    let out: { prompt: string; correctAnswer: string; explanation: string } | null = null;
    for (let attempt = 0; attempt < 3 && out === null; attempt++) {
      const avoid = [
        ...gradedPrompts,
        ...(src.topicId != null ? recentByTopic.get(src.topicId) ?? [] : []),
        ...generated.map((g) => g.stored.prompt),
      ];
      let candidate: { prompt: string; correctAnswer: string; explanation: string };
      try {
        candidate = await chatJson<{ prompt: string; correctAnswer: string; explanation: string }>(
          `You write ONE college ethics practice question on the topic "${topicTitle}" that prepares a student for a graded question on the SAME idea. HARD RULES: (1) The prompt MUST open with a SPECIFIC, concrete SCENARIO or SITUATION (named people, a real-feeling dilemma or case) and then ask the student to APPLY the concept — judge it, decide, or diagnose the reasoning. (2) NEVER ask the student to "define", "explain the difference", "state the principle", or recite the concept in the abstract. (3) The answer MUST require substantive, multi-sentence reasoning — never one word, a term, yes/no, true/false, or fill-in-the-blank. (4) Your scenario MUST be clearly DIFFERENT from — not a paraphrase of — any scenario in the AVOID list; invent a fresh case (different people, setting, and details). (5) The scenario MUST be SELF-CONTAINED and answerable by anyone who understands the concept — NEVER reference the textbook's or lecture's own examples, named cases, characters, or specific passages (do NOT say things like "the rabbit", "the example from the reading", "as in the text", "the case we discussed"). The student must NOT need to have read any particular passage to answer; use a brand-new everyday situation. Provide a rich model answer of 3-5 sentences that works through your scenario. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string} where explanation is a one-sentence summary of the key point.`,
          `Concept being tested (do NOT reproduce this graded wording — it appears on the real assignment):\n"""\n${src.prompt}\n"""\nModel answer of the graded question (for grounding the concept only, do not copy):\n"""\n${src.correctAnswer}\n"""\n\nAVOID — do not repeat or paraphrase any of these scenarios:\n${JSON.stringify(avoid)}`,
        );
      } catch {
        candidate = fallbackFor(topicTitle, i);
      }
      // Accept only if it is not identical to anything already used; otherwise retry.
      if (!used.has(norm(candidate.prompt))) out = candidate;
    }

    // Guaranteed-unique deterministic fallback if the model kept colliding.
    if (out === null) {
      let fb = fallbackFor(topicTitle, i);
      let bump = i;
      while (used.has(norm(fb.prompt))) {
        bump += sourceProblems.length;
        fb = fallbackFor(topicTitle, bump);
      }
      out = fb;
    }

    used.add(norm(out.prompt));
    const [stored] = await db
      .insert(practiceProblemsTable)
      .values({
        sessionId: session.id,
        topicId: src.topicId,
        prompt: out.prompt,
        correctAnswer: out.correctAnswer,
        explanation: out.explanation,
        difficulty: 3.0,
      })
      .returning();
    if (stored) generated.push({ stored, topicTitle });
  }

  res.json(
    GenerateAssignmentPracticeResponse.parse({
      sessionId: session.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      kind: assignment.kind as "homework" | "test" | "midterm" | "final",
      tutorEnabled: true,
      problems: generated
        .filter((g) => g.stored)
        .map((g) => ({
          id: g.stored!.id,
          prompt: g.stored!.prompt,
          topicId: g.stored!.topicId,
          topicTitle: g.topicTitle,
          difficulty: g.stored!.difficulty,
        })),
    }),
  );
});

// ---------- Practice grading with rich coaching feedback + model answer ----------
router.post("/practice/sessions/:sessionId/feedback", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = GradePracticeWithFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  const [problem] = await db
    .select()
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.id, problemId),
        eq(practiceProblemsTable.sessionId, sessionId),
      ),
    );
  if (!problem) {
    res.status(404).json({ error: "problem not found in this session" });
    return;
  }

  const graded = await gradeAnswer({
    prompt: problem.prompt,
    correctAnswer: problem.correctAnswer,
    userAnswer: answer,
  });

  await db.insert(practiceAttemptsTable).values({
    sessionId,
    problemId,
    topicId: problem.topicId,
    answer,
    correct: graded.correct,
    difficulty: problem.difficulty,
    trace: trace ?? null,
  });

  let feedback = "";
  try {
    feedback = await chatText(
      "You are an encouraging college ethics tutor giving GENEROUS, detailed feedback on a PRACTICE answer (this never affects any grade, so be candid and thorough). The question is a scenario the student had to APPLY a concept to. Write warm, specific markdown using these labeled sections, each with real substance:\n\n**What you nailed** — name the specific things they got right about the scenario (be concrete; quote or paraphrase their move).\n**What's missing or off** — pinpoint exactly where the reasoning is thin, wrong, or skips a step in applying the concept to THIS scenario.\n**How to make it airtight** — 2-3 concrete, actionable suggestions to strengthen the answer (a consideration to add, a distinction to draw, a part of the scenario to engage).\n**Try this** — one short follow-up prompt or question that pushes their thinking, and an invitation to discuss it further below.\n\nCoach them toward the model answer; do NOT just paste it. Be specific to the scenario, not generic. 8-14 sentences total.",
      JSON.stringify({
        scenario_question: problem.prompt,
        model_answer: problem.correctAnswer,
        student_answer: answer,
        verdict: graded.correct ? "on the right track" : "needs work",
      }),
    );
  } catch {
    feedback = graded.correct
      ? "Nice work — your answer captures the key idea. Compare it with the model answer below to see if there's any nuance you can add."
      : "You're not quite there yet. Re-read the model answer below, then try to explain the core idea in your own words and add a concrete example.";
  }

  res.json(
    GradePracticeWithFeedbackResponse.parse({
      problemId,
      correct: graded.correct,
      modelAnswer: problem.correctAnswer,
      feedback,
      explanation: graded.explanation || problem.explanation,
    }),
  );
});

// ---------- Practice discussion: chat about a specific problem (answer stays server-side) ----------
router.post("/practice/sessions/:sessionId/discuss", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = DiscussPracticeProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, message, history } = parsed.data;
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(eq(practiceSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  const [problem] = await db
    .select()
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.id, problemId),
        eq(practiceProblemsTable.sessionId, sessionId),
      ),
    );
  if (!problem) {
    res.status(404).json({ error: "problem not found in this session" });
    return;
  }

  const priorTurns = Array.isArray(history)
    ? history
        .slice(-8)
        .map((t) => `${t.role === "assistant" ? "Tutor" : "Student"}: ${t.content}`)
        .join("\n")
    : "";

  const sys =
    "You are an encouraging college ethics tutor discussing a single practice problem with a student. You may reference the model answer to guide the student, but do not just paste it — explain, give examples, and ask guiding questions. Keep replies to 3-6 sentences unless asked for more.";
  const user = `PRACTICE PROBLEM:\n"""\n${problem.prompt}\n"""\n\nMODEL ANSWER (for your guidance only):\n"""\n${problem.correctAnswer}\n"""\n${priorTurns ? `\nConversation so far:\n${priorTurns}\n` : ""}\nStudent says: ${message}`;

  let reply = "";
  try {
    reply = await chatText(sys, user);
  } catch {
    reply =
      "I'm having trouble reaching the tutor service right now. Try again in a moment, and in the meantime re-read the relevant lecture section.";
  }

  res.json(DiscussPracticeProblemResponse.parse({ reply }));
});

export default router;
