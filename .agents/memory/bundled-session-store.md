---
name: Bundled server + connect-pg-simple table.sql
description: Why OAuth login broke in production with /?error=auth_failed and how session-store table provisioning must be handled in an esbuild-bundled server.
---

# Session store table.sql missing from bundled dist breaks login

**Rule:** when the API server is bundled with esbuild, any runtime file a dependency reads relative to `__dirname` must be copied into `dist/`. `connect-pg-simple` with `createTableIfMissing: true` reads `table.sql` at runtime; if it's absent, session-table creation fails with ENOENT, sessions never persist, and Google OAuth ends in `/?error=auth_failed` even though the OAuth redirect itself works.

**Why:** the bundle rewrites `__dirname` to `dist/`, so package-relative assets silently vanish from production builds. The failure is invisible in dev if the table already exists locally.

**How to apply:** the api-server build script copies `connect-pg-simple/table.sql` into `dist/` after bundling — keep that step when touching the build. The session table is `user_sessions` in the external Neon DB (standard connect-pg-simple schema: sid PK, sess json, expire + index); it was also created manually with `IF NOT EXISTS`, so the ENOENT path only triggers if the table is ever dropped. Symptom signature in deployment logs: `ENOENT ... dist/table.sql` from `PGStore._rawEnsureSessionStoreTable` right after an `/auth/google` 302.
