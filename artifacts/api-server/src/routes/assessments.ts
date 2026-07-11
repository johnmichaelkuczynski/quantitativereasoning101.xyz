import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  attemptsTable,
  problemsTable,
  assessmentInstancesTable,
  assessmentProblemsTable,
} from "@workspace/db";
import {
  GetAssessmentsOverviewResponse,
  StartAssessmentParams,
  StartAssessmentResponse,
  StartSelfAssessmentResponse,
  GetAssessmentInstanceResponse,
  SaveAssessmentAnswerBody,
  SaveAssessmentAnswerResponse,
  SubmitAssessmentResponse,
  GetAssessmentResultResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";
import { detect } from "../lib/detection";
import {
  BLUEPRINT,
  generateAssessmentForm,
  normalizePrompt,
} from "../lib/assessment-blueprint";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

const GRADED_SLOTS = ["baseline", "week1", "week2", "week3", "week4"] as const;
type GradedSlot = (typeof GRADED_SLOTS)[number];

const SLOT_TITLE: Record<string, string> = {
  baseline: "Baseline diagnostic",
  week1: "Week 1 diagnostic",
  week2: "Week 2 diagnostic",
  week3: "Week 3 diagnostic",
  week4: "Week 4 diagnostic",
  self: "Self-assessment",
};

/** The course week a graded slot is gated behind (baseline is never gated). */
function slotWeek(slot: GradedSlot): number | null {
  if (slot === "baseline") return null;
  return Number(slot.replace("week", ""));
}

/**
 * A week's diagnostic unlocks once every graded assignment in that week has a
 * submitted attempt ("end of the week"). Baseline is always available.
 */
async function computeLock(
  slot: GradedSlot,
): Promise<{ locked: boolean; unlockHint: string | null }> {
  const week = slotWeek(slot);
  if (week === null) return { locked: false, unlockHint: null };

  const weekAssignments = await db
    .select({ id: assignmentsTable.id })
    .from(assignmentsTable)
    .where(eq(assignmentsTable.weekNumber, week));
  if (weekAssignments.length === 0) {
    // No coursework gates it — leave it open.
    return { locked: false, unlockHint: null };
  }

  let remaining = 0;
  for (const a of weekAssignments) {
    const [submitted] = await db
      .select({ id: attemptsTable.id })
      .from(attemptsTable)
      .where(
        and(
          eq(attemptsTable.assignmentId, a.id),
          eq(attemptsTable.status, "submitted"),
        ),
      )
      .limit(1);
    if (!submitted) remaining++;
  }
  if (remaining === 0) return { locked: false, unlockHint: null };
  return {
    locked: true,
    unlockHint: `Finish all Week ${week} assignments to unlock (${remaining} left).`,
  };
}

/** Latest instance for a slot (graded slots have at most one meaningful one). */
async function latestInstance(slot: string) {
  const [row] = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.slot, slot))
    .orderBy(desc(assessmentInstancesTable.id))
    .limit(1);
  return row ?? null;
}

/** Build the de-duplication context: every prompt ever shown anywhere. */
async function buildExclusion(): Promise<{
  excludeNorm: Set<string>;
  excludeList: string[];
}> {
  const priorAssessment = await db
    .select({ prompt: assessmentProblemsTable.prompt })
    .from(assessmentProblemsTable)
    .orderBy(desc(assessmentProblemsTable.id));
  const gradedProblems = await db
    .select({ prompt: problemsTable.prompt })
    .from(problemsTable);

  const all = [
    ...priorAssessment.map((r) => r.prompt),
    ...gradedProblems.map((r) => r.prompt),
  ];
  const excludeNorm = new Set(all.map(normalizePrompt));
  // Cap the human-readable list handed to the model (most recent assessment
  // prompts first) so the prompt stays a reasonable size.
  const excludeList = all.slice(0, 80);
  return { excludeNorm, excludeList };
}

async function createInstance(opts: {
  slot: string;
  kind: "graded" | "self";
  title: string;
}) {
  const { excludeNorm, excludeList } = await buildExclusion();
  const items = await generateAssessmentForm(excludeNorm, excludeList);

  const [instance] = await db
    .insert(assessmentInstancesTable)
    .values({ slot: opts.slot, kind: opts.kind, title: opts.title, status: "in_progress" })
    .returning();
  if (!instance) throw new Error("failed to create assessment instance");

  await db.insert(assessmentProblemsTable).values(
    items.map((it) => ({
      instanceId: instance.id,
      domain: it.domain,
      domainTitle: it.domainTitle,
      position: it.position,
      prompt: it.prompt,
      correctAnswer: it.correctAnswer,
      explanation: it.explanation,
      hint: it.hint,
    })),
  );
  return instance;
}

async function loadInstancePlayable(instanceId: number) {
  const [instance] = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.id, instanceId));
  if (!instance) return null;
  const problems = await db
    .select()
    .from(assessmentProblemsTable)
    .where(eq(assessmentProblemsTable.instanceId, instanceId))
    .orderBy(asc(assessmentProblemsTable.position));
  return {
    id: instance.id,
    slot: instance.slot as "baseline" | "week1" | "week2" | "week3" | "week4" | "self",
    kind: instance.kind as "graded" | "self",
    title: instance.title,
    status: instance.status as "in_progress" | "submitted",
    problems: problems.map((p) => ({
      id: p.id,
      position: p.position,
      domain: p.domain,
      domainTitle: p.domainTitle,
      prompt: p.prompt,
      hint: p.hint,
      answer: p.answer,
    })),
  };
}

// ---------- Overview ----------
router.get("/assessments", async (_req, res) => {
  const slots = [];
  let completed = 0;
  for (const slot of GRADED_SLOTS) {
    const { locked, unlockHint } = await computeLock(slot);
    const instance = await latestInstance(slot);
    let status: "not_started" | "in_progress" | "submitted" = "not_started";
    if (instance) {
      status = instance.status === "submitted" ? "submitted" : "in_progress";
    }
    if (status === "submitted") completed++;
    slots.push({
      slot,
      title: SLOT_TITLE[slot]!,
      locked,
      unlockHint,
      status,
      instanceId: instance?.id ?? null,
      scorePercent: instance?.scorePercent ?? null,
      passed: instance?.passed ?? null,
    });
  }

  const selfInstances = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.slot, "self"))
    .orderBy(desc(assessmentInstancesTable.id));
  const selfSubmitted = selfInstances.filter((i) => i.status === "submitted");
  const lastSelf = selfSubmitted[0] ?? null;

  res.json(
    GetAssessmentsOverviewResponse.parse({
      slots,
      completed,
      total: GRADED_SLOTS.length,
      bucketPercent: Number(((completed / GRADED_SLOTS.length) * 100).toFixed(2)),
      self: {
        attempts: selfSubmitted.length,
        lastScorePercent: lastSelf?.scorePercent ?? null,
        lastInstanceId: lastSelf?.id ?? null,
      },
    }),
  );
});

// ---------- Start a fresh self-assessment ----------
// NOTE: must be registered BEFORE "/assessments/:slot/start" so that the literal
// "self" path is not captured by the :slot param and rejected as an invalid slot.
router.post("/assessments/self/start", async (_req, res): Promise<void> => {
  const instance = await createInstance({
    slot: "self",
    kind: "self",
    title: SLOT_TITLE.self!,
  });
  const playable = await loadInstancePlayable(instance.id);
  res.json(StartSelfAssessmentResponse.parse(playable));
});

router.post("/assessments/:slot/start", async (req, res): Promise<void> => {
  const parsed = StartAssessmentParams.safeParse({ slot: req.params.slot });
  if (!parsed.success) {
    res.status(400).json({ error: "invalid slot" });
    return;
  }
  const slot = parsed.data.slot as GradedSlot;

  const { locked, unlockHint } = await computeLock(slot);
  if (locked) {
    res.status(403).json({ error: unlockHint ?? "diagnostic is locked" });
    return;
  }

  // Resume an in-progress instance; refuse to re-take a completed one.
  const existing = await latestInstance(slot);
  if (existing && existing.status === "in_progress") {
    const playable = await loadInstancePlayable(existing.id);
    res.json(StartAssessmentResponse.parse(playable));
    return;
  }
  if (existing && existing.status === "submitted") {
    res.status(400).json({ error: "this diagnostic is already complete" });
    return;
  }

  const instance = await createInstance({
    slot,
    kind: "graded",
    title: SLOT_TITLE[slot]!,
  });
  const playable = await loadInstancePlayable(instance.id);
  res.json(StartAssessmentResponse.parse(playable));
});

// ---------- Get an instance ----------
router.get("/assessments/instances/:id", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const playable = await loadInstancePlayable(id);
  if (!playable) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }
  res.json(GetAssessmentInstanceResponse.parse(playable));
});

// ---------- Save an answer ----------
router.put("/assessments/instances/:id/answer", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SaveAssessmentAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;

  const [instance] = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.id, id));
  if (!instance) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }
  if (instance.status !== "in_progress") {
    res.status(400).json({ error: "assessment already submitted" });
    return;
  }

  const updated = await db
    .update(assessmentProblemsTable)
    .set({
      answer,
      keystrokeCount: trace.keystrokeCount,
      eraseCount: trace.eraseCount,
      bulkInsertCount: trace.bulkInsertCount ?? 0,
      longestBulkInsertChars: trace.longestBulkInsertChars ?? 0,
      rewriteSegments: trace.rewriteSegments ?? 0,
      durationMs: trace.durationMs,
    })
    .where(
      and(
        eq(assessmentProblemsTable.id, problemId),
        eq(assessmentProblemsTable.instanceId, id),
      ),
    )
    .returning({ id: assessmentProblemsTable.id });
  if (updated.length === 0) {
    res.status(404).json({ error: "problem not found on this assessment" });
    return;
  }
  res.json(SaveAssessmentAnswerResponse.parse({ ok: true }));
});

type DomainResult = {
  domain: string;
  domainTitle: string;
  correct: number;
  total: number;
};

async function generateFeedback(
  slot: string,
  percent: number,
  domainResults: DomainResult[],
  baselinePercent: number | null,
): Promise<{
  overall: string;
  perDomain: Array<DomainResult & { comment: string }>;
  growth: string | null;
}> {
  const growthContext =
    slot === "baseline" || baselinePercent === null
      ? "This is the student's baseline (no prior score to compare)."
      : `The student's baseline score was ${baselinePercent.toFixed(
          0,
        )}%. This administration scored ${percent.toFixed(
          0,
        )}%. Describe the change in one encouraging sentence.`;

  try {
    const out = await chatJson<{
      overall: string;
      perDomain: Array<{ domain: string; comment: string }>;
      growth: string | null;
    }>(
      "You are a supportive quantitative-reasoning instructor writing brief, specific, encouraging feedback on a full-subject diagnostic. Respond as strict JSON.",
      `Overall score: ${percent.toFixed(0)}%.\n` +
        `Per-domain results: ${JSON.stringify(domainResults)}\n` +
        `${growthContext}\n\n` +
        `Return JSON: {"overall": string (2-3 sentences naming the strongest and weakest domains), "perDomain": [{"domain": string (the domain key), "comment": string (one concrete, actionable sentence)}], "growth": ${
          slot === "baseline" || baselinePercent === null
            ? "null"
            : "string (one sentence on the change vs baseline)"
        }}. Include one perDomain entry for every domain key provided.`,
    );
    const commentByDomain = new Map(
      (out.perDomain ?? []).map((d) => [d.domain, d.comment]),
    );
    return {
      overall: out.overall || fallbackOverall(percent, domainResults),
      perDomain: domainResults.map((d) => ({
        ...d,
        comment:
          commentByDomain.get(d.domain) ?? fallbackDomainComment(d),
      })),
      growth: slot === "baseline" ? null : out.growth ?? null,
    };
  } catch {
    return {
      overall: fallbackOverall(percent, domainResults),
      perDomain: domainResults.map((d) => ({
        ...d,
        comment: fallbackDomainComment(d),
      })),
      growth:
        slot === "baseline" || baselinePercent === null
          ? null
          : percent >= baselinePercent
          ? `You improved from ${baselinePercent.toFixed(0)}% to ${percent.toFixed(0)}%.`
          : `You went from ${baselinePercent.toFixed(0)}% to ${percent.toFixed(
              0,
            )}% — revisit the weaker domains.`,
    };
  }
}

function fallbackDomainComment(d: DomainResult): string {
  const pct = d.total === 0 ? 0 : (d.correct / d.total) * 100;
  if (pct >= 100) return `Strong — you nailed ${d.domainTitle}.`;
  if (pct >= 50) return `Developing — review the missed ${d.domainTitle} item.`;
  return `Needs work — focus your next study session on ${d.domainTitle}.`;
}

function fallbackOverall(percent: number, domainResults: DomainResult[]): string {
  const sorted = [...domainResults].sort(
    (a, b) => b.correct / Math.max(1, b.total) - a.correct / Math.max(1, a.total),
  );
  const strongest = sorted[0]?.domainTitle ?? "several areas";
  const weakest = sorted[sorted.length - 1]?.domainTitle ?? "a few areas";
  return `You scored ${percent.toFixed(
    0,
  )}% across the full subject. Strongest: ${strongest}. Focus next on: ${weakest}.`;
}

// ---------- Submit ----------
router.post("/assessments/instances/:id/submit", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [instance] = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.id, id));
  if (!instance) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }
  if (instance.status === "submitted") {
    res.status(400).json({ error: "already submitted" });
    return;
  }

  const problems = await db
    .select()
    .from(assessmentProblemsTable)
    .where(eq(assessmentProblemsTable.instanceId, id))
    .orderBy(asc(assessmentProblemsTable.position));

  const perProblem = [];
  const detection = [];
  let score = 0;
  const domainTotals = new Map<string, DomainResult>();
  for (const p of problems) {
    const graded = await gradeAnswer({
      prompt: p.prompt,
      correctAnswer: p.correctAnswer,
      userAnswer: p.answer,
    });
    if (graded.correct) score += 1;
    const explanation = graded.explanation || p.explanation;

    // Screen every non-empty answer with the two-layer AI-authorship detector,
    // exactly like graded homework/tests.
    if (p.answer.trim().length > 0) {
      const det = await detect(p.answer, {
        keystrokeCount: p.keystrokeCount,
        eraseCount: p.eraseCount,
        bulkInsertCount: p.bulkInsertCount,
        longestBulkInsertChars: p.longestBulkInsertChars,
        rewriteSegments: p.rewriteSegments,
        durationMs: p.durationMs,
      });
      detection.push({ problemId: p.id, ...det });
      await db
        .update(assessmentProblemsTable)
        .set({
          correct: graded.correct,
          feedback: explanation,
          aiScore: det.aiScore,
          aiFlagged: det.aiFlagged,
          diachronicScore: det.diachronicScore,
          diachronicFlagged: det.diachronicFlagged,
          detectionRationale: det.rationale,
        })
        .where(eq(assessmentProblemsTable.id, p.id));
    } else {
      await db
        .update(assessmentProblemsTable)
        .set({ correct: graded.correct, feedback: explanation })
        .where(eq(assessmentProblemsTable.id, p.id));
    }

    const dr =
      domainTotals.get(p.domain) ??
      { domain: p.domain, domainTitle: p.domainTitle, correct: 0, total: 0 };
    dr.total += 1;
    if (graded.correct) dr.correct += 1;
    domainTotals.set(p.domain, dr);

    perProblem.push({
      problemId: p.id,
      position: p.position,
      domain: p.domain,
      domainTitle: p.domainTitle,
      prompt: p.prompt,
      correct: graded.correct,
      userAnswer: p.answer,
      correctAnswer: p.correctAnswer,
      explanation,
      feedback: explanation,
    });
  }

  const total = problems.length;
  const percent = total === 0 ? 0 : (score / total) * 100;

  // Keep domain order aligned with the blueprint.
  const domainResults: DomainResult[] = BLUEPRINT.map(
    (d) =>
      domainTotals.get(d.key) ?? {
        domain: d.key,
        domainTitle: d.title,
        correct: 0,
        total: 0,
      },
  ).filter((d) => d.total > 0);

  // Growth vs the most recent submitted baseline (if this isn't the baseline).
  let baselinePercent: number | null = null;
  if (instance.slot !== "baseline") {
    const [baseline] = await db
      .select({ scorePercent: assessmentInstancesTable.scorePercent })
      .from(assessmentInstancesTable)
      .where(
        and(
          eq(assessmentInstancesTable.slot, "baseline"),
          eq(assessmentInstancesTable.status, "submitted"),
        ),
      )
      .orderBy(desc(assessmentInstancesTable.id))
      .limit(1);
    baselinePercent = baseline?.scorePercent ?? null;
  }

  const feedback = await generateFeedback(
    instance.slot,
    percent,
    domainResults,
    baselinePercent,
  );

  await db
    .update(assessmentInstancesTable)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      scorePercent: Number(percent.toFixed(2)),
      passed: true, // submitting a diagnostic counts as passing for the grade bucket
      feedback,
    })
    .where(eq(assessmentInstancesTable.id, id));

  res.json(
    SubmitAssessmentResponse.parse({
      id: instance.id,
      slot: instance.slot,
      kind: instance.kind,
      score,
      total,
      percent: Number(percent.toFixed(2)),
      passed: true,
      perProblem,
      feedback,
      detection,
    }),
  );
});

// ---------- Result ----------
router.get("/assessments/instances/:id/result", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [instance] = await db
    .select()
    .from(assessmentInstancesTable)
    .where(eq(assessmentInstancesTable.id, id));
  if (!instance) {
    res.status(404).json({ error: "assessment not found" });
    return;
  }
  if (instance.status !== "submitted") {
    res.status(400).json({ error: "assessment not submitted yet" });
    return;
  }

  const problems = await db
    .select()
    .from(assessmentProblemsTable)
    .where(eq(assessmentProblemsTable.instanceId, id))
    .orderBy(asc(assessmentProblemsTable.position));

  let score = 0;
  const detection: Array<{
    problemId: number;
    aiScore: number;
    aiFlagged: boolean;
    diachronicScore: number;
    diachronicFlagged: boolean;
    rationale: string;
  }> = [];
  const perProblem = problems.map((p) => {
    if (p.correct) score += 1;
    if (p.aiScore != null) {
      detection.push({
        problemId: p.id,
        aiScore: p.aiScore,
        aiFlagged: !!p.aiFlagged,
        diachronicScore: p.diachronicScore ?? 0,
        diachronicFlagged: !!p.diachronicFlagged,
        rationale: p.detectionRationale ?? "",
      });
    }
    return {
      problemId: p.id,
      position: p.position,
      domain: p.domain,
      domainTitle: p.domainTitle,
      prompt: p.prompt,
      correct: !!p.correct,
      userAnswer: p.answer,
      correctAnswer: p.correctAnswer,
      explanation: p.explanation,
      feedback: p.feedback,
    };
  });
  const total = problems.length;

  res.json(
    GetAssessmentResultResponse.parse({
      id: instance.id,
      slot: instance.slot,
      kind: instance.kind,
      score,
      total,
      percent: instance.scorePercent ?? 0,
      passed: !!instance.passed,
      perProblem,
      feedback: instance.feedback,
      detection,
    }),
  );
});

export default router;
