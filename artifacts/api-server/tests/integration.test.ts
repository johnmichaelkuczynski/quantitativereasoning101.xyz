/**
 * API-level integration suite for the deterministic parts of the diagnostics
 * and personalization flows.
 *
 * All OpenAI calls are stubbed (see the vi.mock below), so:
 *  - Assessment items come from the deterministic domain-valid fallback
 *    generators (still one item per blueprint domain, still de-duplicated).
 *  - Grading uses the exact/numeric-equivalence path (an unmatched answer is
 *    simply wrong — no LLM appeal).
 *  - Feedback and detection use their deterministic fallbacks.
 *
 * AI-shaped fields are asserted by structure (types / ranges / counts), never
 * by exact text.
 */
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

vi.mock("../src/lib/ai", () => ({
  TEXT_MODEL: "test-model",
  FAST_MODEL: "test-model-fast",
  // JSON-mode calls (item generation, LLM grading, feedback, detection) fail
  // fast so every consumer takes its deterministic fallback path.
  chatJson: vi.fn(async () => {
    throw new Error("AI disabled in tests");
  }),
  // Text calls (lecture personalization) return a deterministic passage.
  chatText: vi.fn(
    async () =>
      "# Personalized passage\n\nThis is a deterministic rewritten lecture passage used by the integration tests. It preserves every concept from the source.",
  ),
}));

let app: Express;
let db: typeof import("@workspace/db").db;
let schema: typeof import("@workspace/db");
let pool: typeof import("@workspace/db").pool;
let drizzle: typeof import("drizzle-orm");

beforeAll(async () => {
  // Imported dynamically so the setup-file DATABASE_URL override is applied
  // before @workspace/db creates its pool.
  schema = await import("@workspace/db");
  db = schema.db;
  pool = schema.pool;
  drizzle = await import("drizzle-orm");
  app = (await import("../src/app")).default;
});

afterAll(async () => {
  await pool.end();
});

const typedTrace = (answer: string) => ({
  keystrokeCount: Math.max(10, answer.length * 2),
  eraseCount: 3,
  bulkInsertCount: 0,
  longestBulkInsertChars: 0,
  rewriteSegments: 1,
  durationMs: 45_000,
});

const normalizePrompt = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

describe("graded diagnostic flow + final-grade math", () => {
  let instanceId: number;
  let problems: Array<{ id: number; correctAnswer: string }>;

  it("locks week diagnostics until that week's coursework is submitted", async () => {
    const res = await request(app).post("/api/assessments/week1/start");
    expect(res.status).toBe(403);
    expect(typeof res.body.error).toBe("string");
  });

  it("starts the baseline diagnostic with 7 problems (one per domain)", async () => {
    const res = await request(app).post("/api/assessments/baseline/start");
    expect(res.status).toBe(200);
    expect(res.body.slot).toBe("baseline");
    expect(res.body.kind).toBe("graded");
    expect(res.body.status).toBe("in_progress");
    expect(res.body.problems).toHaveLength(7);

    const positions = res.body.problems.map((p: { position: number }) => p.position);
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const domains = new Set(res.body.problems.map((p: { domain: string }) => p.domain));
    expect(domains.size).toBe(7);
    for (const p of res.body.problems) {
      expect(typeof p.prompt).toBe("string");
      expect(p.prompt.length).toBeGreaterThan(0);
    }

    instanceId = res.body.id;

    // Pull the stored correct answers so the test controls exactly how many
    // problems are answered right.
    const rows = await db
      .select({
        id: schema.assessmentProblemsTable.id,
        correctAnswer: schema.assessmentProblemsTable.correctAnswer,
      })
      .from(schema.assessmentProblemsTable)
      .where(drizzle.eq(schema.assessmentProblemsTable.instanceId, instanceId))
      .orderBy(drizzle.asc(schema.assessmentProblemsTable.position));
    expect(rows).toHaveLength(7);
    problems = rows;
  });

  it("resumes the same in-progress instance instead of creating a new one", async () => {
    const res = await request(app).post("/api/assessments/baseline/start");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(instanceId);
  });

  it("saves an answer for each of the 7 problems", async () => {
    // First 5 answered correctly, last 2 deliberately wrong.
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i]!;
      const answer = i < 5 ? p.correctAnswer : "definitely not the answer";
      const res = await request(app)
        .put(`/api/assessments/instances/${instanceId}/answer`)
        .send({ problemId: p.id, answer, trace: typedTrace(answer) });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    }
  });

  it("submits and grades the diagnostic: 5/7 correct", async () => {
    const res = await request(app).post(
      `/api/assessments/instances/${instanceId}/submit`,
    );
    expect(res.status).toBe(200);

    expect(res.body.score).toBe(5);
    expect(res.body.total).toBe(7);
    expect(res.body.percent).toBeCloseTo((5 / 7) * 100, 1);
    expect(res.body.passed).toBe(true);

    // Per-problem results: structure, not AI text.
    expect(res.body.perProblem).toHaveLength(7);
    const correctCount = res.body.perProblem.filter(
      (p: { correct: boolean }) => p.correct,
    ).length;
    expect(correctCount).toBe(5);
    for (const p of res.body.perProblem) {
      expect(typeof p.explanation).toBe("string");
      expect(p.explanation.length).toBeGreaterThan(0);
    }

    // Feedback: structural assertions only.
    expect(typeof res.body.feedback.overall).toBe("string");
    expect(res.body.feedback.overall.length).toBeGreaterThan(0);
    expect(res.body.feedback.perDomain).toHaveLength(7);
    for (const d of res.body.feedback.perDomain) {
      expect(typeof d.comment).toBe("string");
      expect(d.total).toBeGreaterThan(0);
    }
    // Baseline has no growth comparison.
    expect(res.body.feedback.growth).toBeNull();

    // Every non-empty answer was screened by the detector.
    expect(res.body.detection).toHaveLength(7);
    for (const d of res.body.detection) {
      expect(d.aiScore).toBeGreaterThanOrEqual(0);
      expect(d.aiScore).toBeLessThanOrEqual(1);
      expect(d.diachronicScore).toBeGreaterThanOrEqual(0);
      expect(d.diachronicScore).toBeLessThanOrEqual(1);
      expect(typeof d.rationale).toBe("string");
      expect(d.rationale.length).toBeGreaterThan(0);
    }
  });

  it("refuses to re-take a submitted graded diagnostic", async () => {
    const res = await request(app).post("/api/assessments/baseline/start");
    expect(res.status).toBe(400);
  });

  it("shows the baseline as submitted in the overview (1/5 of the bucket)", async () => {
    const res = await request(app).get("/api/assessments");
    expect(res.status).toBe(200);
    const baseline = res.body.slots.find(
      (s: { slot: string }) => s.slot === "baseline",
    );
    expect(baseline.status).toBe("submitted");
    expect(res.body.completed).toBe(1);
    expect(res.body.total).toBe(5);
    expect(res.body.bucketPercent).toBeCloseTo(20, 2);
  });

  it("computes finalGrade = 0.8 × coursework average + 0.2 × diagnostics bucket", async () => {
    // Two submitted coursework attempts: 90% and 70% → official average 80%.
    const [assignment] = await db
      .select({ id: schema.assignmentsTable.id })
      .from(schema.assignmentsTable)
      .limit(1);
    expect(assignment).toBeDefined();
    await db.insert(schema.attemptsTable).values([
      {
        assignmentId: assignment!.id,
        status: "submitted",
        submittedAt: new Date(),
        scorePercent: 90,
      },
      {
        assignmentId: assignment!.id,
        status: "submitted",
        submittedAt: new Date(),
        scorePercent: 70,
      },
    ]);

    const res = await request(app).get("/api/analytics/summary");
    expect(res.status).toBe(200);

    // officialAverage = (90 + 70) / 2 = 80
    expect(res.body.officialAverage).toBeCloseTo(80, 2);
    // 1 of 5 graded diagnostic slots submitted → bucket = 20%
    expect(res.body.diagnosticsCompleted).toBe(1);
    expect(res.body.diagnosticsTotal).toBe(5);
    expect(res.body.diagnosticsBucketPercent).toBeCloseTo(20, 2);
    // finalGrade = 0.8 × 80 + 0.2 × 20 = 68
    expect(res.body.finalGrade).toBeCloseTo(0.8 * 80 + 0.2 * 20, 2);
  });
});

describe("self-assessment non-overlap", () => {
  it("generates parallel forms whose prompts never repeat across administrations", async () => {
    const first = await request(app).post("/api/assessments/self/start");
    expect(first.status).toBe(200);
    expect(first.body.kind).toBe("self");
    expect(first.body.problems).toHaveLength(7);

    const second = await request(app).post("/api/assessments/self/start");
    expect(second.status).toBe(200);
    expect(second.body.id).not.toBe(first.body.id);
    expect(second.body.problems).toHaveLength(7);

    const firstPrompts = new Set(
      first.body.problems.map((p: { prompt: string }) => normalizePrompt(p.prompt)),
    );
    // No overlap between the two self-assessment forms.
    for (const p of second.body.problems) {
      expect(firstPrompts.has(normalizePrompt(p.prompt))).toBe(false);
    }

    // No overlap with the earlier baseline form either.
    const baselinePrompts = await db
      .select({ prompt: schema.assessmentProblemsTable.prompt })
      .from(schema.assessmentProblemsTable)
      .innerJoin(
        schema.assessmentInstancesTable,
        drizzle.eq(
          schema.assessmentProblemsTable.instanceId,
          schema.assessmentInstancesTable.id,
        ),
      )
      .where(drizzle.eq(schema.assessmentInstancesTable.slot, "baseline"));
    const baselineNorm = new Set(
      baselinePrompts.map((r) => normalizePrompt(r.prompt)),
    );
    for (const p of [...first.body.problems, ...second.body.problems]) {
      expect(baselineNorm.has(normalizePrompt(p.prompt))).toBe(false);
    }

    // No overlap with the fixed graded coursework problems.
    const graded = await db
      .select({ prompt: schema.problemsTable.prompt })
      .from(schema.problemsTable);
    const gradedNorm = new Set(graded.map((r) => normalizePrompt(r.prompt)));
    for (const p of [...first.body.problems, ...second.body.problems]) {
      expect(gradedNorm.has(normalizePrompt(p.prompt))).toBe(false);
    }
  });
});

describe("lecture custom versions: create / select / delete", () => {
  let lectureId: number;
  let versionId: number;

  it("starts with no custom versions for a lecture", async () => {
    const [lecture] = await db
      .select({ id: schema.lecturesTable.id })
      .from(schema.lecturesTable)
      .limit(1);
    expect(lecture).toBeDefined();
    lectureId = lecture!.id;

    const res = await request(app).get(`/api/course/lectures/${lectureId}/custom`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects empty and oversized instructions", async () => {
    const empty = await request(app)
      .post(`/api/course/lectures/${lectureId}/custom`)
      .send({ instructions: "   " });
    expect(empty.status).toBe(400);

    const oversized = await request(app)
      .post(`/api/course/lectures/${lectureId}/custom`)
      .send({ instructions: "x".repeat(1001) });
    expect(oversized.status).toBe(400);
  });

  it("404s when the lecture doesn't exist", async () => {
    const res = await request(app)
      .post("/api/course/lectures/999999/custom")
      .send({ instructions: "explain with soccer examples" });
    expect(res.status).toBe(404);
  });

  it("creates a personalized version", async () => {
    const res = await request(app)
      .post(`/api/course/lectures/${lectureId}/custom`)
      .send({
        instructions: "explain everything with soccer examples",
        label: "Soccer version",
      });
    expect(res.status).toBe(200);
    expect(res.body.lectureId).toBe(lectureId);
    expect(res.body.label).toBe("Soccer version");
    expect(typeof res.body.body).toBe("string");
    expect(res.body.body.length).toBeGreaterThan(20);
    versionId = res.body.id;
  });

  it("lists the created version so the client can select and render it", async () => {
    const res = await request(app).get(`/api/course/lectures/${lectureId}/custom`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(versionId);
    // The body the reader renders when this version is selected.
    expect(typeof res.body[0].body).toBe("string");
    expect(res.body[0].body.length).toBeGreaterThan(20);
  });

  it("deletes the version", async () => {
    const del = await request(app).delete(
      `/api/course/lectures/custom/${versionId}`,
    );
    expect(del.status).toBe(200);
    expect(del.body.ok).toBe(true);

    const res = await request(app).get(`/api/course/lectures/${lectureId}/custom`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
