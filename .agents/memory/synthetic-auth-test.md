---
name: Synthetic auth test
description: How to e2e-test Google-login gating and full course functionality without a real Google account.
---

# Synthetic auth test

Run: `pnpm --filter @workspace/scripts run synthetic-auth-test` (dev server must be running; hits `localhost:80`).

What it does:
- Phase 1: anonymous lockout — 401s on all APIs, 302 to accounts.google.com on /api/auth/google.
- Phase 2–3: forges a real signed express-session cookie (HMAC-SHA256 with SESSION_SECRET, connect-pg-simple `user_sessions` row) for a synthetic student and for the admin email, then exercises protected routes, admin gating (403 vs 200), and Administrative analytics.
- Phase 4: runs the system diagnostic and full synthetic-student diagnostic through the logged-in session (OpenAI, grading, detection, practice, analytics).
- Phase 5: logout kills the session. Cleans up all synthetic rows.

**Why:** Google's account-chooser cannot be automated without real human credentials; forging the post-OAuth session tests everything on our side of Google. User demanded synthetic testing of "all functions including Google login" — this is the closest achievable coverage, plus a live 302-to-Google check proving credentials/strategy are configured.

**How to apply:** Re-run after any auth, session, or route-gating change. Exit code non-zero on any failed check. Admin gate is hardcoded to the owner's Gmail in auth.ts (do not modify that file — canonical).
