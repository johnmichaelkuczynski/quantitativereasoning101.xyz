---
name: EthosReason (qr-course) conventions
description: Non-obvious cross-cutting rules for the EthosReason ethics course app — OpenAPI title lock, practice vs graded tutor split, reseed behavior.
---

## OpenAPI title is locked
The OpenAPI `info.title` is `Api`. Do NOT change it — it controls the generated
filenames in `@workspace/api-client-react`. After editing `lib/api-spec/openapi.yaml`,
run `pnpm --filter @workspace/api-spec run codegen`.

## Practice vs graded tutor split (product rule)
**Rule:** The live AI tutor is shown ONLY in practice mode, and MUST stay hidden in
the graded assignment runner.
- Practice page `/assignments/:id/practice` shows a persistent `TutorPane` plus a
  per-problem discuss chat; it is unlimited + ungraded and infinitely regenerable.
- Graded runner `/assignments/:id` has no tutor — only a "practice first" CTA banner.
**Why:** integrity — graded answers must be the student's own; practice is where help lives.
**How to apply:** never add tutor/discuss UI to the graded runner; keep the practice
route registered BEFORE `/assignments/:id` in the wouter `Switch` or it gets shadowed.

## Substantive-answer requirement (content rule)
Every graded assignment problem must demand a multi-sentence reasoned answer — no
one-word / yes-no / true-false / fill-in-blank / "define in N words". The shared
`AnswerInput` has a `prose` mode (readable font, no math keyboard / quick-pick) used
by both the graded runner and practice; non-prose mode is the math-style large mono input.

## Lecture depth generation must be lazy/per-lecture
Medium/Long lecture bodies are generated on demand via
`POST /api/diagnostics/expand-lectures?level=medium|long&id=<lectureId>` (one lecture
≈ 28-30s). Do NOT batch all 27 lectures (or omit `id`) from the browser — that runs
many minutes in one fetch and the proxy/browser times out, so it *looks* broken even
though the backend succeeds.
**How to apply:** the LectureView Medium/Long tabs generate the missing depth for the
current lecture only, with a loading state, then `refetch`. Scope/reset that gen state
by `lectureId` and guard async completion (`targetId === lectureId`) so a slow response
doesn't mutate UI after navigating to another lecture. The short `body` is the only
field seeded; `bodyMedium`/`bodyLong` are NULL until generated.

## Practice no-repeat must be enforced server-side, not just prompted
The assignment-practice generator (`POST /assignments/:id/practice`) must GUARANTEE no
identical prompts — never rely on LLM "avoid this list" guidance alone.
**Why:** parallel `Promise.all` generation can't see same-set siblings, and the fallback
path emits identical generic prompts when a topic repeats within one assignment — both
violate the user's hard "NO repeats / nothing identical to graded" requirement.
**How to apply:** generate sequentially; keep a normalized (`lowercase, collapse ws`)
`used` set seeded with all graded prompts + recent practice prompts; pass already-generated
siblings into the `avoid` list each iteration; retry on collision; vary the deterministic
fallback by index (angle list + `case N`) and bump the index until unique.

## Analytics-driven focus pointers (evolving profile)
`GET /assignments/:id/focus` reads the user's logged `practice_attempts` to compute, per
assignment topic, attempts/accuracy/strengthLabel/priority + a precise pointer string,
plus an overall `readiness` (accuracy × topic-coverage × 100) and a headline. The
PracticeAssignment `FocusPanel` refetches after each graded practice answer so the profile
visibly evolves. The "profile" is just the practice_attempts table — no separate store.

## Reseed behavior
`POST /api/diagnostics/reseed` wipes ALL content + progress then re-seeds from
`seed.ts`. It is gated to non-production (`NODE_ENV !== "production"` → 403 in prod).
Assignment IDs are serial and keep incrementing across reseeds — do NOT assume id=1;
fetch `/api/assignments` to get current ids (they started at 13 after one reseed).
