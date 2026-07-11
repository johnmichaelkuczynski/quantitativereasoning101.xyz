---
name: Practice twin feature
description: How the ungraded "practice twin" of each graded assignment works, and the invariants its generation/submit/feedback loop must keep.
---

# Practice twin (QuantReason)

Every graded assignment (homework/test/midterm/final) has an infinitely-regeneratable
ungraded PRACTICE twin. Practice gives heavy per-problem feedback, a post-submit
feedback dialogue (the tutor talking about the feedback), and an analytics-based
focus report. A live tutor stays on-screen during practice; it is hidden for the
graded version.

## Invariants that MUST hold (these were the bug classes found in review)
- **No repeats / no overlap with graded.** Generation must enforce this *server-side*,
  not just by prompting the LLM. Normalize each candidate prompt and reject any that
  collides with: every graded prompt for the source, every prior practice prompt for
  the source, and the current batch. The randomized arithmetic fallback (used when the
  LLM fails) must also loop until it produces a normalized-unique prompt — a
  deterministic fallback regenerates identical problems across attempts.
- **Submit is idempotent.** Block submit unless the practice attempt is `in_progress`.
  Re-submitting re-grades and re-runs the per-topic outcome recorder, double-counting
  mastery. Same guard applies to saving answers after submit.
- **Answer save must verify ownership.** Check the update's `rowCount`; a `problemId`
  that isn't part of that practice assignment updates 0 rows and must 404, not return ok.
- **Feedback dialogue UI must refetch.** After a feedback-chat mutation, refetch the
  messages query (server persists both user + assistant turns) before clearing the
  optimistic pending bubble — otherwise replies vanish until manual reload.

## Per-topic mastery profile
`recordTopicOutcome(topicId, correct)` keeps an EMA (alpha 0.3) per topic and is hooked
into THREE places: graded assignment submit, topic-drill grade, and practice-assignment
submit. The focus report cross-references this evolving EMA with the current attempt's
misses to produce surgically specific "do this next" pointers, worst-first.

These invariants are now guarded by the committed API test suite
(`tests/practice-assignments.test.ts` in the api-server, run by the `api-tests`
validation) — non-overlap, regeneration uniqueness, submit idempotency, and
answer ownership all have failing tests if they regress.

**Why:** these four invariants are the core product promises ("never repeats", fair
ungraded practice, trustworthy analytics). Breaking any silently corrupts mastery data
or breaks the non-repeat guarantee.
