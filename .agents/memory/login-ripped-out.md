---
name: Login ripped out by user demand
description: Clerk auth was fully removed at the user's explicit insistence; the app is intentionally single-user with no login.
---

# Login was removed on purpose

In June 2026 the user emphatically demanded the entire Clerk login system be ripped out ("DO NOT FIX... DO NOT PATCH... RIP IT OUT"), saying they have their own plan for auth. All server middleware, route scoping, userId schema columns, frontend Clerk wiring, and per-user data were removed; the Neon schema was reverted (no `user_id` columns, `topic_profile` PK is `topic_id` alone). Per-user progress rows were truncated as part of the revert.

**Why:** the user has an unstated future plan that requires a clean slate.

**How to apply:** treat the absence of auth as intentional, not a gap. Do not propose, re-add, or partially restore login/user-scoping unless the user explicitly asks. CLERK_* env secrets may still exist — leave them alone. If auth returns later, the removed implementation exists in git history at checkpoint "Add user authentication and data isolation with Clerk".
