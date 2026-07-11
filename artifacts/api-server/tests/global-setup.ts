/**
 * Global setup for the API integration suite.
 *
 * Runs once per `vitest run`:
 *  1. Ensures the dedicated `qr_course_test` database exists (created next to
 *     the dev database on the same Postgres server).
 *  2. Pushes the current Drizzle schema into it.
 *  3. Seeds the course content (topics, lectures, assignments, problems).
 *  4. Truncates all student-generated tables so every run starts from a
 *     deterministic blank slate.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DB_NAME = "qr_course_test";

export default async function globalSetup(): Promise<void> {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error("DATABASE_URL must be set to run the integration suite");
  }
  const url = new URL(base);
  url.pathname = `/${TEST_DB_NAME}`;
  const testUrl = url.toString();

  // 1. Create the test database if it doesn't exist yet.
  const { default: pg } = await import("pg");
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DB_NAME],
    );
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
  } finally {
    await admin.end();
  }

  // 2. Push the current schema into the test database.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(here, "../../..");
  execSync("pnpm --filter @workspace/db run push-force", {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });

  // From here on, this process talks to the TEST database only.
  process.env.DATABASE_URL = testUrl;
  delete process.env.NEON_DATABASE_URL;

  // 3. Seed course content (idempotent — only seeds when empty).
  const { seedIfEmpty } = await import("../src/lib/seed");
  await seedIfEmpty();

  // 4. Wipe all student-generated state for a deterministic starting point.
  const { db, pool } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    TRUNCATE
      attempts,
      answers,
      practice_sessions,
      practice_problems,
      practice_attempts,
      practice_assignments,
      practice_assignment_problems,
      practice_feedback_messages,
      assessment_instances,
      assessment_problems,
      lecture_custom_versions,
      topic_profile
    RESTART IDENTITY CASCADE
  `);
  await pool.end();
}
