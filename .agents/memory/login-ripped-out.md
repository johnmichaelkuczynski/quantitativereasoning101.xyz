---
name: Clerk login ripped out; Google OAuth is the only approved auth
description: Historical Clerk removal at user demand, superseded by the user's canonical Google OAuth file.
---

# Auth history: Clerk removed, canonical Google OAuth installed

In June 2026 the user emphatically demanded the entire Clerk login system be ripped out ("DO NOT FIX... DO NOT PATCH... RIP IT OUT"). All Clerk middleware, route scoping, userId schema columns, and frontend wiring were removed; the Neon schema was reverted (no `user_id` columns, `topic_profile` PK is `topic_id` alone).

In July 2026 the user's stated plan arrived: a canonical Passport + Google OAuth `auth.ts` (see google-oauth-canonical.md). That file is now the ONLY permitted login system.

**Why:** the user wants real public Google login — never Clerk, never Replit Auth, permanently.

**How to apply:** never reintroduce Clerk or Replit Auth in any form. Auth changes go through the canonical Google OAuth file's rules. Login stays optional; the app stays fully open; auth only gates `/api/admin/*`.
