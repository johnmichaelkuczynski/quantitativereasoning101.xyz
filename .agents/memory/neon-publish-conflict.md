---
name: Neon external DB vs Replit-managed DB publish conflict
description: Why Replit's Publish flow can stall when an app uses an external DATABASE_URL while a Replit-managed DB also exists, and how to resolve it without data loss.
---

# Publish stalls when external DATABASE_URL coexists with a Replit-managed DB

This project's app uses an **external Neon Postgres** via a user-set `DATABASE_URL` secret. Replit also auto-provisioned its own managed Postgres for the project. The Publish screen then shows: "External database detected. Remove DATABASE_URL from Secrets to use Replit database features."

**Symptom:** user reports "it won't publish" / republish does nothing, and `listDeploymentBuilds` shows NO new build attempts after the warning appeared — the click is gated in the Publish UI before a build is ever created.

**REAL ROOT CAUSE (observed, corrects the assumption below):** the actual publish blocker was an **out-of-sync / missing PRODUCTION secret** flagged in the Publish settings ("1 secret out of sync — <NAME> is missing from this environment"). A required prod secret missing silently aborts the deploy: a dialog flashes for an instant and vanishes, and NO build record is ever created. The "External database detected" banner is a **separate harmless warning, not the blocker.** When a republish flashes-and-dies with zero new builds, FIRST check the Publish settings ("Adjust settings") for any out-of-sync/missing production secret and have the user add it. The DB banner is a red herring for the publish-won't-start symptom.

**Key diagnosis facts (verify, don't assume):**
- `getDeploymentInfo()` can still report `isDeployed:true, hasSuccessfulBuild:true` — that's the last *successful* build still serving; it does NOT mean a new publish succeeded.
- Build/health pipeline is healthy: `/api/healthz` is a trivial `{status:"ok"}` (no DB), `app.listen` is non-blocking, and `seedIfEmpty()` runs detached (`.catch`), so startup does not block on Neon cold starts.
- A lone `failed` build whose logs end at "Waiting for service to be ready" after a successful build is a transient promote/health-probe flake, not a code bug.

**Resolution that KEEPS Neon + all data:** delete the *empty Replit-managed database* (Database pane → Delete database), NOT the `DATABASE_URL` secret. The user-set Secret survives deleting the managed DB, so the app keeps using Neon and the conflict warning clears.

**Why:** the warning is Replit telling you "you brought your own DB, so our DB features are off." It is informational, but the Publish UI can gate on resolving the managed-vs-external conflict. Removing the unused managed DB clears the gate.

**How to apply:** there is no programmatic delete-database callback — it's a user UI action. Confirm DB direction with the user first (keep external vs switch to Replit). Never remove `DATABASE_URL` without explicit consent — doing so points the live app at an empty Replit DB and loses access to Neon data.

## Follow-on failure mode: prod serves 500s with Neon "The endpoint has been disabled"

After the managed DB was deleted, production kept a **stale DATABASE_URL snapshot** pointing at the deleted managed DB's disabled Neon endpoint. Symptom: every prod DB query fails with `The endpoint has been disabled. Enable it using the API and retry.` while dev works with the same secret name.

**Diagnosis shortcut:** curl the prod `/api/diagnostics/system` endpoint — "DATABASE_URL present: PASS" + "SELECT 1: FAIL" proves the value is stale, not missing. Deployment secrets are a snapshot; republishing does NOT auto-sync a secret the Publish UI marks out-of-sync.

**Fix (user-only action):** Publish tool → Adjust settings → Secrets → sync the out-of-sync `DATABASE_URL` → Republish. The agent cannot read or set production secret values.
