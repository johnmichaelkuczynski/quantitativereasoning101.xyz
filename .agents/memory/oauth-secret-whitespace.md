---
name: OAuth secret whitespace
description: Pasted secrets can carry invisible whitespace; how it broke Google login and the guard now in place
---

Rule: never trust pasted secret values to be clean. A `GOOGLE_CLIENT_SECRET` pasted with one embedded whitespace char (36 chars instead of 35) made Google's token endpoint return `invalid_client`, so every real login died at the callback with a bare 500 — while login redirect, session store, and state checks all worked.

**Why:** Google client secrets are exactly `GOCSPX-` + 28 chars (35 total). Whitespace-stripped version returned `invalid_grant` (pair valid), proving the stored value was right except for the stray char.

**How to apply:**
- Diagnose credential validity directly: POST to `https://oauth2.googleapis.com/token` with a bogus code — `invalid_client` = bad id/secret pair; `invalid_grant` = pair valid.
- Guard: `artifacts/api-server/src/lib/env-hygiene.ts` strips whitespace from GOOGLE_CLIENT_ID/SECRET at startup; it must stay the FIRST import in `src/index.ts` (before app/auth modules load). Do not touch canonical auth.ts for this.
- curl drops `Secure` cookies over http, so localhost repros of with-session OAuth legs silently test the no-session path — send the Cookie header manually.
