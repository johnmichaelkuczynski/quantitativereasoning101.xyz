/**
 * Per-worker test environment. Runs BEFORE any test file is imported, so the
 * DATABASE_URL override is in place before `@workspace/db` creates its pool.
 *
 * Tests run against a dedicated `qr_course_test` database (created and
 * schema-pushed by global-setup.ts) so they never touch dev data.
 */
export const TEST_DB_NAME = "qr_course_test";

const base = process.env.DATABASE_URL;
if (!base) {
  throw new Error("DATABASE_URL must be set to derive the test database URL");
}
const url = new URL(base);
url.pathname = `/${TEST_DB_NAME}`;
process.env.DATABASE_URL = url.toString();

// Make sure external AI/detection services are never hit from tests.
delete process.env.GPTZERO_API_KEY;
// Session store must also point at the test database.
delete process.env.NEON_DATABASE_URL;

process.env.NODE_ENV = "test";
