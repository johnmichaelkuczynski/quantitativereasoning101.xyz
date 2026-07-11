# 🎓 QuantReason

**The Quantitative Reasoning Studio — A Four-Week College Course That Teaches, Tutors, and Proofs Itself**

---

## 🧩 Overview

QuantReason is a self-paced, single-user web course that delivers a full month of college-freshman Quantitative Reasoning — taught, tutored, drilled, and graded entirely by AI, with built-in academic-integrity enforcement.

It compresses the experience of a semester-style QR class into one focused product: read the lecture at the depth you want, ask a tutor scoped to the exact section you're on, drill problems whose difficulty adapts to you in real time, and submit homework, tests, a midterm, and a final that are AI-graded with feedback and screened for AI-generated answers.

Designed for **students, instructors evaluating AI-taught coursework, and researchers studying AI academic integrity**, QuantReason pairs a real curriculum with two layers of AI-authorship detection — surfacing not just *whether* the writing looks AI-generated, but whether the *act of producing it* did.

---

## 🧠 What It Does

- **Four-Week Structured Curriculum** — A complete QR syllabus across 28 topics: proportional reasoning, descriptive statistics, probability, exponential and linear models, financial math, data interpretation, and inference. Each week ships with lectures, homework, and a test; week four adds a midterm and a final.
- **Three-Depth Lectures** — Every lecture is available at **Short / Medium / Long** length, AI-rewritten while preserving the same examples and learning objectives. Skim the concept, expand it on demand, or read the textbook-style deep cut.
- **Section-Scoped AI Tutor** — Ask a question about the paragraph you're reading and the answer streams back token-by-token, grounded in that exact lecture section. Suggested starter questions are pre-generated per lecture.
- **Adaptive Topic Practice** — Generated problem sets that move difficulty up after a streak and down after a miss, with explanations on every answer. Per-session difficulty persists, so each drill picks up where the last one left off.
- **AI-Graded Assignments** — Homework, tests, midterm, and final are scored by an LLM grader that returns per-problem correctness *plus* a written rationale, then rolls up to a percent score on the attempt.
- **Two-Layer AI Detection on Every Submission** — Each submitted answer is screened by both a static text classifier (GPTZero) and a diachronic keystroke-pattern detector. Each verdict ships with a human-readable rationale.
- **Live Analytics** — Dashboard KPIs (attempts, accuracy, streak), per-topic mastery percentages, and a recent-activity feed — so progress, weak spots, and momentum are all visible at a glance.
- **Operator Diagnostics** — Two one-click self-tests (system health and synthetic-student end-to-end run) verify the entire stack — database, OpenAI integration, GPTZero, detection pipeline, and the practice/grade loop — before you trust a session.
- **Built-In Product Demo Video** — A 62-second screencast of the live UI — animated cursor, real typing, real streaming responses — ships as its own deployable artifact, so the product can show itself without anyone narrating it.

---

## ⚙️ Technical Features

- **Two-Layer AI-Authorship Detection** —
  - **Static (GPTZero):** Every submitted answer is sent to GPTZero's `predict/text` endpoint; the per-document AI probability is blended `0.85 × GPTZero + 0.15 × structural-heuristic` for the final score. If GPTZero is unavailable, the system silently falls back to an LLM scorer plus heuristic — submissions never block.
  - **Diachronic (Keystroke Pattern):** The student textarea captures keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and total duration. A scorer penalizes paste-then-reword behavior, low keystroke-to-output ratios, and impossibly sustained typing speeds — catching AI use even when the final text is reworded enough to pass GPTZero.
- **Two Diagnostic Self-Tests** —
  - **System Diagnostic** (`/diagnostics/system`): Eight ordered checks — environment, database round-trip, course-seed integrity, OpenAI chat completion, OpenAI JSON mode, detection pipeline, AI-positive control sample, and GPTZero connectivity. Each step returns pass/fail, timing, and a raw error string.
  - **Synthetic-Student Diagnostic** (`/diagnostics/synthetic-run`): Spins up a fake student, runs a practice session (wrong → adjust ↓ → right → adjust ↑), takes a full assignment attempt, submits it, and verifies grading + detection + analytics all reflect the run. End-to-end stack proof in one click.
- **Contract-First API** — A single OpenAPI document is the source of truth; React Query hooks for the UI and Zod validators for the server are generated from it. Request and response shapes can't drift between client and server because both come from the same spec.
- **Streaming AI Tutor** — Token-by-token Server-Sent-Event streaming for tutor answers, with a section-scoped system prompt so responses stay grounded in the lecture the student is reading.
- **Adaptive Practice Engine** — Per-session difficulty (1–4 continuous) adjusts after each attempt; the next-problem generator takes the current difficulty and the topic as input, so the question pool is generated on demand instead of pre-baked.
- **Real-React Demo Video** — The 62-second product walkthrough is a real React app, not a slideshow: persistent sidebar, animated SVG cursor, character-by-character typing, word-by-word streaming responses, and scene-synced background audio — all exported as MP4 from a single browser tab.
- **Operator Console** — A dedicated Diagnostics page in the student app surfaces both self-tests with one-click execution, per-step pass/fail rows, and raw error output for debugging.
- **Living README** — This README plus a companion `BLUEPRINT.md` architecture document are kept in lock-step with the code — short-form and long-form views of the same truth.

---

## 🎓 Designed For

- **College Freshmen & Self-Learners:** A complete one-month QR course delivered with on-demand tutoring and adaptive practice — no instructor required.
- **Instructors & Curriculum Designers:** A working reference for what AI-taught, AI-graded, AI-detection-screened coursework actually looks like end-to-end.
- **Academic-Integrity Researchers:** A live testbed for layered AI-authorship detection that combines text-based classification with behavioral keystroke evidence.
- **Product & Engineering Teams:** A reference implementation of contract-first full-stack architecture, streaming AI UX, and self-diagnostic operator tooling in a Replit pnpm monorepo.

---

## 💡 Core Idea

QuantReason reframes an AI-taught course as a *closed accountability loop*.

It doesn't just teach the material and grade the homework — it **teaches**, **tutors**, **drills**, **grades**, **detects misuse**, and **proves the whole pipeline still works** with a single click. The result is a self-paced course that students can actually trust to be fair, and that instructors can actually trust to be honest.

**QuantReason — where the curriculum, the tutor, the grader, and the integrity check all live in one room.**
