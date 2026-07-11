---
name: No login by user decree
description: The user explicitly demanded complete removal of the Clerk login system; the app is intentionally open/single-user.
---

# No login system — deliberate user decision

On July 11, 2026 the user emphatically demanded the entire Clerk login system be ripped out ("I have a plan, which requires you to rip out any existing login system"). The full auth commit was reverted: Clerk client/server packages removed, requireAuth/proxy middlewares deleted, all routes un-scoped, userId columns dropped from Neon, topic_profile PK back to (topicId), landing/sign-in pages removed.

**Why:** the user has their own plan for auth/access; any patched or "improved" login is explicitly unwanted.

**How to apply:** do NOT reintroduce authentication, per-user scoping, or sign-in UI unless the user explicitly asks. Unused CLERK_* env vars/integration config may still exist — code no longer references them; leave secrets alone.
