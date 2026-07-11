---
name: Canonical Google OAuth auth.ts
description: User-mandated verbatim Passport Google OAuth file; rules that must not be broken.
---

# Canonical Google OAuth (Passport) — verbatim constraint

The api-server's `auth.ts` is a user-supplied canonical file (Passport + passport-google-oauth20 + express-session + connect-pg-simple). Google login ONLY — the user has forbidden Replit Auth and Clerk permanently.

**Rules:**
- The file must stay byte-verbatim except app-specific domain values (prod domain, www variant, replit.app domain, localhost port). Never "improve" it — no logger migration, no refactors, no return-style fixes.
- `noImplicitReturns` is disabled in the api-server tsconfig specifically so the canonical logout handler compiles unchanged. Do not re-enable it there without user sign-off.
- Login is MANDATORY (July 2026 user demand: "if they do not sign in with Google, they do not see the site. PERIOD."). All `/api` routes except `/api/healthz` and the auth endpoints sit behind `isAuthenticated` (applied in `app.ts`, not inside auth.ts); the frontend shows a full-screen sign-in wall when signed out. `/api/admin/*` is additionally gated by `isAdmin`.
- Credentials come from vault `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` via the file's `GOOGLE_LOGIN_* → GOOGLE_OAUTH_* → GOOGLE_*` fallback chain — no new secrets needed.
- OAuth callback path is `/auth/google/callback`, so the api-server artifact must keep `/auth` in its proxy paths alongside `/api`.

**Why:** User explicitly demanded the attached file be used verbatim after a Clerk build was fully ripped out; a one-line TS fix inside the file was flagged as a constraint violation in review and had to be reverted in favor of the tsconfig relaxation.

**How to apply:** Any future change touching auth must preserve byte-verbatim status of `auth.ts`; satisfy tooling via config, not by editing the file.
