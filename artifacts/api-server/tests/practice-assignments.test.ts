/**
 * Integration suite for the practice-assignment ("twin") invariants:
 *
 *  1. Non-overlap — a generated twin's prompts never collide (normalized)
 *     with the source assignment's graded prompts.
 *  2. No repeats across regenerations — regenerating a twin for the same
 *     source produces a NEW practice assignment whose prompts don't collide
 *     with any prior twin's prompts (or the graded ones).
 *  3. Submit is idempotent — a second submit is rejected, and answers can't
 *     be saved after submit (would double-count topic mastery otherwise).
 *  4. Answer save verifies ownership — a problemId outside the twin 404s.
 *
 * All OpenAI calls are stubbed (chatJson throws), so problem generation uses
 * the randomized arithmetic fallback — which must itself uphold the
 * non-overlap invariant — and grading uses the exact-match path.
 */
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";

vi.mock("../src/lib/ai", () => ({
  TEXT_MODEL: "test-model",
  FAST_MODEL: "test-model-fast",
  chatJson: vi.fn(async () => {
    throw new Error("AI disabled in tests");
  }),
  chatText: vi.fn(async () => "Deterministic tutor reply used by tests."),
}));

vi.mock("../src/auth", () => ({
  setupAuth: () => {},
  isAuthenticated: (_req: unknown, _res: unknown, next: () => void) => next(),
  isAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
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

const normalizePrompt = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const typedTrace = (answer: string) => ({
  keystrokeCount: Math.max(10, answer.length * 2),
  eraseCount: 2,
  bulkInsertCount: 0,
  longestBulkInsertChars: 0,
  rewriteSegments: 1,
  durationMs: 30_000,
});

type TwinProblem = { id: number; position: number; prompt: string; topicId: number };

describe("practice twin: generation non-overlap + regeneration uniqueness", () => {
  let sourceAssignmentId: number;
  let gradedNorm: Set<string>;
  let firstTwinId: number;
  let firstTwinProblems: TwinProblem[];

  it("404s when the source assignment doesn't exist", async () => {
    const res = await request(app)
      .post("/api/practice-assignments/generate")
      .send({ sourceAssignmentId: 999999 });
    expect(res.status).toBe(404);
  });

  it("generates a twin whose prompts never overlap the graded source", async () => {
    const [assignment] = await db
      .select({ id: schema.assignmentsTable.id })
      .from(schema.assignmentsTable)
      .orderBy(drizzle.asc(schema.assignmentsTable.id))
      .limit(1);
    expect(assignment).toBeDefined();
    sourceAssignmentId = assignment!.id;

    const sourceProblems = await db
      .select({
        position: schema.problemsTable.position,
        prompt: schema.problemsTable.prompt,
      })
      .from(schema.problemsTable)
      .where(drizzle.eq(schema.problemsTable.assignmentId, sourceAssignmentId))
      .orderBy(drizzle.asc(schema.problemsTable.position));
    expect(sourceProblems.length).toBeGreaterThan(0);
    gradedNorm = new Set(sourceProblems.map((p) => normalizePrompt(p.prompt)));

    const res = await request(app)
      .post("/api/practice-assignments/generate")
      .send({ sourceAssignmentId });
    expect(res.status).toBe(200);
    expect(res.body.sourceAssignmentId).toBe(sourceAssignmentId);
    expect(res.body.status).toBe("in_progress");
    // One twin problem per source problem, mirroring positions.
    expect(res.body.problems).toHaveLength(sourceProblems.length);
    expect(res.body.problems.map((p: TwinProblem) => p.position)).toEqual(
      sourceProblems.map((p) => p.position),
    );

    // Invariant 1: no twin prompt collides (normalized) with any graded prompt.
    for (const p of res.body.problems as TwinProblem[]) {
      expect(p.prompt.length).toBeGreaterThan(0);
      expect(gradedNorm.has(normalizePrompt(p.prompt))).toBe(false);
    }

    // No duplicates within the batch itself.
    const batchNorm = res.body.problems.map((p: TwinProblem) =>
      normalizePrompt(p.prompt),
    );
    expect(new Set(batchNorm).size).toBe(batchNorm.length);

    firstTwinId = res.body.id;
    firstTwinProblems = res.body.problems;
  });

  it("regenerating creates a NEW twin with zero prompt overlap against the first twin or the graded source", async () => {
    const res = await request(app)
      .post("/api/practice-assignments/generate")
      .send({ sourceAssignmentId });
    expect(res.status).toBe(200);
    // Regeneration is a fresh twin, not a duplicate of the existing one.
    expect(res.body.id).not.toBe(firstTwinId);
    expect(res.body.problems).toHaveLength(firstTwinProblems.length);

    const firstNorm = new Set(
      firstTwinProblems.map((p) => normalizePrompt(p.prompt)),
    );
    for (const p of res.body.problems as TwinProblem[]) {
      const norm = normalizePrompt(p.prompt);
      // Invariant 2: never repeats a prior twin's problem…
      expect(firstNorm.has(norm)).toBe(false);
      // …and still never overlaps the graded source.
      expect(gradedNorm.has(norm)).toBe(false);
    }

    // Cross-check against everything stored for this source in the DB:
    // all prompts across all twins of this source are pairwise unique.
    const allRows = await db
      .select({ prompt: schema.practiceAssignmentProblemsTable.prompt })
      .from(schema.practiceAssignmentProblemsTable)
      .innerJoin(
        schema.practiceAssignmentsTable,
        drizzle.eq(
          schema.practiceAssignmentProblemsTable.practiceAssignmentId,
          schema.practiceAssignmentsTable.id,
        ),
      )
      .where(
        drizzle.eq(
          schema.practiceAssignmentsTable.sourceAssignmentId,
          sourceAssignmentId,
        ),
      );
    const allNorm = allRows.map((r) => normalizePrompt(r.prompt));
    expect(new Set(allNorm).size).toBe(allNorm.length);
  });

  describe("answer ownership + submit idempotency", () => {
    let problems: Array<{ id: number; correctAnswer: string }>;

    it("saves answers for the first twin's problems", async () => {
      const rows = await db
        .select({
          id: schema.practiceAssignmentProblemsTable.id,
          correctAnswer: schema.practiceAssignmentProblemsTable.correctAnswer,
        })
        .from(schema.practiceAssignmentProblemsTable)
        .where(
          drizzle.eq(
            schema.practiceAssignmentProblemsTable.practiceAssignmentId,
            firstTwinId,
          ),
        )
        .orderBy(drizzle.asc(schema.practiceAssignmentProblemsTable.position));
      expect(rows.length).toBe(firstTwinProblems.length);
      problems = rows;

      // Answer all but the last correctly.
      for (let i = 0; i < problems.length; i++) {
        const p = problems[i]!;
        const answer =
          i < problems.length - 1 ? p.correctAnswer : "definitely not the answer";
        const res = await request(app)
          .put(`/api/practice-assignments/${firstTwinId}/answer`)
          .send({ problemId: p.id, answer, trace: typedTrace(answer) });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
      }
    });

    it("404s when saving an answer for a problem that isn't part of this twin", async () => {
      const res = await request(app)
        .put(`/api/practice-assignments/${firstTwinId}/answer`)
        .send({ problemId: 999999, answer: "42", trace: typedTrace("42") });
      expect(res.status).toBe(404);
    });

    it("submits and grades the twin with the expected score", async () => {
      const res = await request(app).post(
        `/api/practice-assignments/${firstTwinId}/submit`,
      );
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(problems.length);
      expect(res.body.score).toBe(problems.length - 1);
      expect(res.body.percent).toBeCloseTo(
        ((problems.length - 1) / problems.length) * 100,
        1,
      );

      // Per-problem feedback: structural assertions only (AI is stubbed).
      expect(res.body.perProblem).toHaveLength(problems.length);
      for (const p of res.body.perProblem) {
        expect(typeof p.feedback).toBe("string");
        expect(p.feedback.length).toBeGreaterThan(0);
      }

      // Focus report exists structurally.
      expect(typeof res.body.focusReport.summary).toBe("string");
      expect(res.body.focusReport.readiness).toBeGreaterThanOrEqual(0);
      expect(res.body.focusReport.readiness).toBeLessThanOrEqual(100);
      expect(Array.isArray(res.body.focusReport.pointers)).toBe(true);
    });

    it("rejects a second submit (idempotency guard)", async () => {
      const res = await request(app).post(
        `/api/practice-assignments/${firstTwinId}/submit`,
      );
      expect(res.status).toBe(400);

      // The stored attempt is still a single submitted record with the
      // original score — nothing was re-graded or double-counted.
      const [pa] = await db
        .select()
        .from(schema.practiceAssignmentsTable)
        .where(drizzle.eq(schema.practiceAssignmentsTable.id, firstTwinId));
      expect(pa!.status).toBe("submitted");
      expect(pa!.scorePercent).toBeCloseTo(
        ((problems.length - 1) / problems.length) * 100,
        1,
      );
    });

    it("rejects saving an answer after submit", async () => {
      const p = problems[0]!;
      const res = await request(app)
        .put(`/api/practice-assignments/${firstTwinId}/answer`)
        .send({ problemId: p.id, answer: "changed", trace: typedTrace("changed") });
      expect(res.status).toBe(400);
    });

    it("serves the submitted result", async () => {
      const res = await request(app).get(
        `/api/practice-assignments/${firstTwinId}/result`,
      );
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(problems.length);
      expect(res.body.score).toBe(problems.length - 1);
      expect(res.body.perProblem).toHaveLength(problems.length);
    });

    it("regeneration AFTER a submitted twin still avoids every prior prompt", async () => {
      const res = await request(app)
        .post("/api/practice-assignments/generate")
        .send({ sourceAssignmentId });
      expect(res.status).toBe(200);

      const priorRows = await db
        .select({ prompt: schema.practiceAssignmentProblemsTable.prompt })
        .from(schema.practiceAssignmentProblemsTable)
        .innerJoin(
          schema.practiceAssignmentsTable,
          drizzle.eq(
            schema.practiceAssignmentProblemsTable.practiceAssignmentId,
            schema.practiceAssignmentsTable.id,
          ),
        )
        .where(
          drizzle.and(
            drizzle.eq(
              schema.practiceAssignmentsTable.sourceAssignmentId,
              sourceAssignmentId,
            ),
            drizzle.ne(schema.practiceAssignmentsTable.id, res.body.id),
          ),
        );
      const priorNorm = new Set(priorRows.map((r) => normalizePrompt(r.prompt)));
      for (const p of res.body.problems as TwinProblem[]) {
        const norm = normalizePrompt(p.prompt);
        expect(priorNorm.has(norm)).toBe(false);
        expect(gradedNorm.has(norm)).toBe(false);
      }
    });
  });
});
