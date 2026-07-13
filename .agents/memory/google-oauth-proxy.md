---
name: Google OAuth behind the shared proxy
description: Constraints for the canonical Google OAuth auth.ts in this monorepo (callback path, bundling quirk).
---

- The shared proxy routes only `/api/*` to the API server, so all OAuth routes — including the Google callback — must live under `/api` (`/api/auth/google/callback`). Un-prefixed `/auth/...` routes never reach the server through the proxy.
  **Why:** initial login 302 worked but any un-prefixed callback URI would 404 at the web artifact.
  **How to apply:** whatever callback URI the server computes must also be registered in the owner's Google Cloud Console OAuth client for each domain (dev domain + production domains).
- connect-pg-simple's `createTableIfMissing` reads `table.sql` via `__dirname`; esbuild bundling breaks that path (ENOENT at runtime). The api-server build copies `table.sql` into `dist/`, and the `user_sessions` table also exists in the DB already.
- Google credentials live in secrets `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (the canonical auth file's fallback names); `SESSION_SECRET` is set too.
- The owner explicitly requires real Google OAuth for the public — never substitute Clerk or Replit Auth in this project.
- Confirmed working end-to-end in production (owner signed in successfully). Fastest full prod check: GET `/api/diagnostics/system` (DB + seed + OpenAI), then `/api/auth/google` expecting 302 to accounts.google.com with the prod callback in `redirect_uri`.
- Platform-injected deployment env rows (CLERK_*, CONNECTORS_HOSTNAME, PG*) reappear on every publish. They are Replit infrastructure noise; the app reads none of them. Don't treat them as the cause of auth failures — verify with a codebase grep for clerk (zero hits) and a live 302 test instead.
- A NEON_DATABASE_URL secret may point at a different Neon host than DATABASE_URL; the canonical auth pool prefers it (`NEON_DATABASE_URL || DATABASE_URL`), so sessions can live in a different DB than users. Works via `createTableIfMissing`, but check both hosts are alive if only login breaks.
