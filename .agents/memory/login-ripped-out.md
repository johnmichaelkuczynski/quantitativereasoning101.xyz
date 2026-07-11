---
name: All login removed permanently
description: User ordered every login system removed from QuantReason — no auth of any kind is permitted
---

# All login removed (July 11, 2026)

Auth history: Clerk was ripped out at user demand (June 2026); a user-supplied "canonical" Google OAuth replaced it (July 2026); then on July 11, 2026 the user ordered the ENTIRE login system ripped out, including that Google OAuth. Every prior auth mandate is revoked.

**The rule:** QuantReason has NO login system. No Google OAuth, no Clerk, no Replit Auth, no sessions, no passport, no user accounts, no admin gating. The site is fully open to anonymous visitors. Do not add, fix, patch, or suggest any auth unless the user explicitly asks in the future.

**Why:** The user stated repeatedly and emphatically that they have a plan requiring zero login ("RIP OUT ALL EXISTING LOGIN... DESTROY IT"). Production Google OAuth had been failing with intermittent Neon session-store 500s ("The endpoint has been disabled"); the user chose total removal over repair.

**How to apply:** If auth code, dependencies (passport, express-session, connect-pg-simple), session stores, or UI (sign-in screens, user menus, Administrative page, admin gating) resurface, that is a regression — remove them. All /api routes and the SPA must work with no cookies or credentials. Removing the session store also eliminated the Neon session-table failure mode; the bundled table.sql build step is gone with it.
