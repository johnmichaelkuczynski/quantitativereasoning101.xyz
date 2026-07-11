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
