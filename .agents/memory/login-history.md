---
name: Login flip-flop history
description: Timeline of auth removal and reinstatement; current confirmed direction is mandatory Google login.
---

# Login history

- June–July 2026: Clerk auth removed at user demand; canonical Google OAuth installed.
- July 11, 2026 (morning): user ordered ALL login ripped out ("I HAVE A PLAN, WHICH REQUIRES YOU TO RIP OUT ANY EXISTING LOGIN SYSTEM"); auth fully deleted and published login-free. The auth DB tables (users, visits) were dropped during this window.
- July 11, 2026 (later): the plan arrived — user re-pasted the canonical Google OAuth instructions and demanded: no sign-in → no site, PERIOD; Administrative page behind admin login; synthetic user testing.
- Auth restored byte-identical from checkpoint history (md5-verified against pre-removal commit); users/visits tables recreated in Neon.

**Why:** The rip-out was a staging step for the reinstall, not a permanent direction. If the user again demands removal or reinstall, expect it may be part of a multi-step plan — restore from git history rather than rewriting, to keep the canonical file byte-verbatim.

**How to apply:** Current state (July 11, 2026): mandatory Google login is the confirmed, tested direction. Never reinstall Clerk or Replit Auth. Verify auth restores with `md5sum` against the git commit.
