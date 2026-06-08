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
      )}/5). Favor concept-identification, short-scenario, and true/false-with-reason questions. The answer must be a short string (a single word, a term, "yes"/"no", or one short phrase) — never multi-paragraph. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string}. Avoid these recent prompts: ${JSON.stringify(
        lastProblems.map((p) => p.prompt),
      )}.`,
      userRequest || `Generate a new ${difficultyLabel} problem on ${topic.title}.`,
    );
  } catch {
    generated = {
      prompt: `Practice (${topic.title}): In one sentence, explain the central idea of "${topic.title}" and give an example.`,
      correctAnswer: "A clear statement of the key idea with a relevant example.",
      explanation: "Re-read the lecture for this topic and state its main claim in your own words.",
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

  // Generate one fresh, substantive practice problem per source problem, on the same topic.
  const generated = await Promise.all(
    sourceProblems.map(async (src) => {
      const topicTitle = src.topicTitle ?? "this topic";
      let out: { prompt: string; correctAnswer: string; explanation: string };
      try {
        out = await chatJson<{ prompt: string; correctAnswer: string; explanation: string }>(
          `You write ONE college ethics practice question that mirrors a graded question but is NOT identical to it. Requirements: (1) it must be on the topic "${topicTitle}"; (2) it MUST require a substantive, multi-sentence reasoned answer — NEVER a one-word, yes/no, true/false, fill-in-the-blank, or "define in N words" question; (3) provide a rich model answer of 3-5 sentences. Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string} where explanation is a one-sentence summary of the key point.`,
          `Graded question to mirror (write a different one on the same idea):\n"""\n${src.prompt}\n"""\nModel answer of the graded question (for grounding, do not copy):\n"""\n${src.correctAnswer}\n"""`,
        );
      } catch {
        out = {
          prompt: `Explain the central idea of "${topicTitle}" in your own words, and illustrate it with an example. Then explain why it matters for moral reasoning.`,
          correctAnswer: src.correctAnswer,
          explanation: `Re-read the lecture on ${topicTitle} and state its main claim, an example, and its significance.`,
        };
      }
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
      return { stored, topicTitle };
    }),
  );

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
      "You are an encouraging college ethics tutor giving feedback on a PRACTICE answer (not graded for a record). Write warm, specific markdown feedback (4-8 sentences). Name what the student got right, pinpoint what is missing or mistaken, and give one concrete suggestion for strengthening the answer. Do NOT simply restate the model answer; coach them toward it. Use short paragraphs or a couple of bullet points.",
      JSON.stringify({
        question: problem.prompt,
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
