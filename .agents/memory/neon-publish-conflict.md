---
name: Neon external DB vs Replit-managed DB publish conflict
description: Why Replit's Publish flow can stall when an app uses an external DATABASE_URL while a Replit-managed DB also exists, and how to resolve it without data loss.
---

# Publish stalls when external DATABASE_URL coexists with a Replit-managed DB

This project's app uses an **external Neon Postgres** via a user-set `DATABASE_URL` secret. Replit also auto-provisioned its own managed Postgres for the project. The Publish screen then shows: "External database detected. Remove DATABASE_URL from Secrets to use Replit database features."

**Symptom:** user reports "it won't publish" / republish does nothing, and `listDeploymentBuilds` shows NO new build attempts after the warning appeared — the click is gated in the Publish UI before a build is ever created.

**Key diagnosis facts (verify, don't assume):**
- `getDeploymentInfo()` can still report `isDeployed:true, hasSuccessfulBuild:true` — that's the last *successful* build still serving; it does NOT mean a new publish succeeded.
- Build/health pipeline is healthy: `/api/healthz` is a trivial `{status:"ok"}` (no DB), `app.listen` is non-blocking, and `seedIfEmpty()` runs detached (`.catch`), so startup does not block on Neon cold starts.
- A lone `failed` build whose logs end at "Waiting for service to be ready" after a successful build is a transient promote/health-probe flake, not a code bug.

**Resolution that KEEPS Neon + all data:** delete the *empty Replit-managed database* (Database pane → Delete database), NOT the `DATABASE_URL` secret. The user-set Secret survives deleting the managed DB, so the app keeps using Neon and the conflict warning clears.

**Why:** the warning is Replit telling you "you brought your own DB, so our DB features are off." It is informational, but the Publish UI can gate on resolving the managed-vs-external conflict. Removing the unused managed DB clears the gate.

**How to apply:** there is no programmatic delete-database callback — it's a user UI action. Confirm DB direction with the user first (keep external vs switch to Replit). Never remove `DATABASE_URL` without explicit consent — doing so points the live app at an empty Replit DB and loses access to Neon data.
