---
name: Multi-user data isolation (Clerk web)
description: How per-user scoping is modeled in QuantReason — which tables carry userId, how child rows are owned, and the cookie-only web auth contract.
---

# Per-user isolation model

QuantReason serves ONE shared curriculum (topics, lectures, assignments, problems — NO userId) but every student sees only their own progress.

## ROOT vs CHILD ownership convention
- **ROOT user-data tables carry a `userId` (Clerk user id, text)** and must be filtered with `eq(table.userId, userId)` on every read/update/delete and set on every insert: `attempts`, `practice_sessions`, `practice_assignments`, `assessment_instances`, `lecture_custom_versions`. `topic_profile` uses a **composite PK `(userId, topicId)`**.
- **CHILD tables are NOT denormalized with userId** — they are owned transitively through their parent ROOT row and must be gated by a parent-ownership check, never queried by their own id alone: `answers`, `practice_problems`, `practice_attempts`, `practice_assignment_problems`, `practice_feedback_messages`, `assessment_problems`.

**Why:** denormalizing userId onto every child invites drift/inconsistency; the parent-gate keeps a single source of ownership truth. The cost is that any handler taking a child id directly MUST join/verify the parent's userId, or it becomes an IDOR.

**How to apply:** when adding a route that accepts a child-row id, resolve and verify the parent's userId before touching it. When adding a new user-data ROOT table, add userId + filter all access + set it on insert.

## Web auth = cookies only
Clerk web sessions authenticate via the session **cookie** through the clerk proxy middleware — there is NO Bearer/token handling in the web client or server. `requireAuth` derives `req.userId` from `getAuth(req)` (`sessionClaims?.userId` is loosely typed `{}`, so cast to `string | undefined` before the guard). All `/api` routes are gated except `healthRouter`.

## Diagnostics under isolation
`diagnostics/reset` must wipe ONLY the caller's rows (`wipeUserData(req.userId)`); `synthetic-run` operates under a sentinel userId `synthetic:<uuid>` and cleans up via the same scoped wipe.
