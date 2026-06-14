import { Router, type IRouter } from "express";
import { eq, asc, desc, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  lecturesTable,
  assignmentsTable,
  attemptsTable,
  lectureCustomVersionsTable,
} from "@workspace/db";
import {
  GetCourseOverviewResponse,
  GetWeekResponse,
  GetLectureResponse,
  ListTopicsResponse,
  ListLectureCustomVersionsResponse,
  CreateLectureCustomVersionBody,
  CreateLectureCustomVersionResponse,
  DeleteLectureCustomVersionResponse,
} from "@workspace/api-zod";
import { chatText } from "../lib/ai";

const router: IRouter = Router();

const WEEK_TITLES: Record<number, { title: string; summary: string }> = {
  1: {
    title: "Week 1 — Foundations",
    summary:
      "Number sense, fractions and percents, ratios, units, expressions, and linear equations.",
  },
  2: {
    title: "Week 2 — Functions and models",
    summary:
      "Lines, systems, quadratics, exponentials, logs, modeling, inequalities.",
  },
  3: {
    title: "Week 3 — Statistics and probability",
    summary:
      "Summarizing data, distributions, probability, inference, regression.",
  },
  4: {
    title: "Week 4 — Reasoning and capstone",
    summary:
      "Sets, logic, combinatorics, geometry, rates, finance, and the capstone.",
  },
};

async function buildWeek(weekNumber: number) {
  const lectures = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      topicId: lecturesTable.topicId,
    })
    .from(lecturesTable)
    .where(eq(lecturesTable.weekNumber, weekNumber))
    .orderBy(asc(lecturesTable.id));

  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.weekNumber, weekNumber))
    .orderBy(asc(assignmentsTable.position));

  const assignmentSummaries = await Promise.all(
    assignments.map(async (a) => {
      const counts = await db.execute(
        sql`select count(*)::int as n from problems where assignment_id = ${a.id}`,
      );
      const n = (counts.rows[0] as { n?: number } | undefined)?.n ?? 0;
      const attempts = await db
        .select()
        .from(attemptsTable)
        .where(eq(attemptsTable.assignmentId, a.id))
        .orderBy(asc(attemptsTable.id));
      const submitted = attempts.filter((x) => x.status === "submitted");
      const inProgress = attempts.find((x) => x.status === "in_progress");
      const best = submitted.reduce(
        (best, x) =>
          x.scorePercent != null && x.scorePercent > best ? x.scorePercent : best,
        -1,
      );
      const status: "not_started" | "in_progress" | "submitted" = inProgress
        ? "in_progress"
        : submitted.length > 0
        ? "submitted"
        : "not_started";
      const last = attempts[attempts.length - 1];
      return {
        id: a.id,
        kind: a.kind as "homework" | "test" | "midterm" | "final",
        title: a.title,
        weekNumber: a.weekNumber,
        problemCount: n,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        status,
        bestScore: best < 0 ? null : best,
        lastAttemptId: last?.id ?? null,
      };
    }),
  );

  const meta = WEEK_TITLES[weekNumber] ?? {
    title: `Week ${weekNumber}`,
    summary: "",
  };

  return {
    weekNumber,
    title: meta.title,
    summary: meta.summary,
    lectures,
    assignments: assignmentSummaries,
  };
}

router.get("/course/overview", async (_req, res) => {
  const weeks = await Promise.all([1, 2, 3, 4].map(buildWeek));
  const assignmentsTotal = weeks.reduce((s, w) => s + w.assignments.length, 0);
  const assignmentsCompleted = weeks.reduce(
    (s, w) => s + w.assignments.filter((a) => a.status === "submitted").length,
    0,
  );
  const practiceCountRow = await db.execute(
    sql`select count(*)::int as n from practice_attempts`,
  );
  const practiceCount =
    (practiceCountRow.rows[0] as { n?: number } | undefined)?.n ?? 0;

  res.json(
    GetCourseOverviewResponse.parse({
      title: "Quantitative Reasoning",
      weeks,
      totals: { assignmentsCompleted, assignmentsTotal, practiceCount },
    }),
  );
});

router.get("/course/weeks/:weekNumber", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.weekNumber)
    ? req.params.weekNumber[0]
    : req.params.weekNumber;
  const weekNumber = parseInt(raw ?? "", 10);
  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    res.status(400).json({ error: "invalid weekNumber" });
    return;
  }
  const week = await buildWeek(weekNumber);
  res.json(GetWeekResponse.parse(week));
});

router.get("/course/lectures/:lectureId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.lectureId)
    ? req.params.lectureId[0]
    : req.params.lectureId;
  const lectureId = parseInt(raw ?? "", 10);
  if (!Number.isFinite(lectureId)) {
    res.status(400).json({ error: "invalid lectureId" });
    return;
  }
  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, lectureId));
  if (!lecture) {
    res.status(404).json({ error: "lecture not found" });
    return;
  }
  res.json(GetLectureResponse.parse(lecture));
});

router.get("/course/topics", async (_req, res) => {
  const rows = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
  res.json(ListTopicsResponse.parse(rows));
});

// ---- Personalized lecture versions (student-authored, alongside the official ones) ----
router.get(
  "/course/lectures/:lectureId/custom",
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.lectureId)
      ? req.params.lectureId[0]
      : req.params.lectureId;
    const lectureId = parseInt(raw ?? "", 10);
    if (!Number.isFinite(lectureId)) {
      res.status(400).json({ error: "invalid lectureId" });
      return;
    }
    const rows = await db
      .select()
      .from(lectureCustomVersionsTable)
      .where(eq(lectureCustomVersionsTable.lectureId, lectureId))
      .orderBy(desc(lectureCustomVersionsTable.id));
    res.json(ListLectureCustomVersionsResponse.parse(rows));
  },
);

router.post(
  "/course/lectures/:lectureId/custom",
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.lectureId)
      ? req.params.lectureId[0]
      : req.params.lectureId;
    const lectureId = parseInt(raw ?? "", 10);
    if (!Number.isFinite(lectureId)) {
      res.status(400).json({ error: "invalid lectureId" });
      return;
    }
    const parsed = CreateLectureCustomVersionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { instructions, sourceText, label } = parsed.data;

    const [lecture] = await db
      .select()
      .from(lecturesTable)
      .where(eq(lecturesTable.id, lectureId));
    if (!lecture) {
      res.status(404).json({ error: "lecture not found" });
      return;
    }

    // Base the rewrite on the selected section if provided, else the whole short body.
    const base = sourceText && sourceText.trim().length > 0 ? sourceText : lecture.body;

    const sys =
      "You are a college quantitative-reasoning lecturer rewriting a passage of a lecture to fit a student's personal request. RULES, no exceptions:\n" +
      "1. PRESERVE every concept, definition, fact, and worked result in the source passage. You may reorganize, re-explain, add examples, or change tone/level — but never drop content or introduce errors.\n" +
      "2. Honor the student's instructions for style, depth, framing, or examples.\n" +
      "3. Use Markdown. Inline math `$...$`, display math `$$...$$` (escape backslashes in LaTeX commands).\n" +
      "4. Return ONLY the rewritten Markdown passage. No preface, no commentary, no code fences around the whole thing.";
    const user =
      `LECTURE TITLE: ${lecture.title}\n\n` +
      `STUDENT INSTRUCTIONS:\n"""\n${instructions}\n"""\n\n` +
      `SOURCE PASSAGE TO REWRITE:\n"""\n${base}\n"""`;

    let body: string;
    try {
      const out = await chatText(sys, user);
      if (!out || out.trim().length < 20) {
        res.status(502).json({ error: "could not generate a personalized version" });
        return;
      }
      body = out.trim();
    } catch (e) {
      req.log.error({ err: e }, "lecture personalize failed");
      res.status(502).json({ error: "could not generate a personalized version" });
      return;
    }

    const finalLabel =
      label && label.trim().length > 0
        ? label.trim().slice(0, 80)
        : instructions.trim().slice(0, 60);

    const [created] = await db
      .insert(lectureCustomVersionsTable)
      .values({
        lectureId,
        label: finalLabel,
        instructions,
        sourceText: sourceText ?? null,
        body,
      })
      .returning();
    if (!created) {
      res.status(500).json({ error: "failed to save personalized version" });
      return;
    }
    res.json(CreateLectureCustomVersionResponse.parse(created));
  },
);

router.delete(
  "/course/lectures/custom/:versionId",
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.versionId)
      ? req.params.versionId[0]
      : req.params.versionId;
    const versionId = parseInt(raw ?? "", 10);
    if (!Number.isFinite(versionId)) {
      res.status(400).json({ error: "invalid versionId" });
      return;
    }
    await db
      .delete(lectureCustomVersionsTable)
      .where(eq(lectureCustomVersionsTable.id, versionId));
    res.json(DeleteLectureCustomVersionResponse.parse({ ok: true }));
  },
);

export default router;
