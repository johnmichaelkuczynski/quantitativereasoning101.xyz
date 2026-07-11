---
name: API integration test suite
description: How the committed api-server test suite isolates the DB and stubs AI; how it's wired into validation.
---

# API integration test suite

- The suite (`pnpm --filter @workspace/api-server run test`, vitest + supertest) runs against a **dedicated `qr_course_test` database** created next to the dev DB on the same Neon server. Never point tests at the dev `neondb` — graded diagnostic slots are one-shot singletons, so tests would destroy or be blocked by real student state.
- **Why:** graded slots refuse re-takes once submitted; a clean, truncated DB per run is the only way the flow tests stay deterministic and non-destructive.
- **How to apply:** `tests/global-setup.ts` creates the DB if missing, runs `drizzle-kit push --force`, seeds course content, truncates student tables. `tests/setup-env.ts` rewrites `DATABASE_URL` before `@workspace/db` is imported — any new test file must import `app`/db dynamically or rely on setupFiles ordering.
- AI is stubbed by `vi.mock("../src/lib/ai")`: `chatJson` throws (so item generation, grading appeals, feedback, and detection all take their deterministic fallback paths), `chatText` returns a fixed passage (so lecture personalization succeeds). Assert AI-shaped fields by structure, never exact text.
- Validation commands `typecheck` and `api-tests` are registered so both run automatically on every change.
- Stale `@workspace/db` lib declarations can surface as bogus TS2339/TS2353 errors on schema columns — run `pnpm run typecheck:libs` first.
