import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  primaryKey,
} from "drizzle-orm/pg-core";

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  blurb: text("blurb"),
  position: integer("position").notNull().default(0),
});

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  bodyMedium: text("body_medium"),
  bodyLong: text("body_long"),
});

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // homework | test | midterm | final
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  position: integer("position").notNull().default(0),
  isTimed: boolean("is_timed").notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  instructions: text("instructions"),
});

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
});

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"),
});

export const answersTable = pgTable("answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  bulkInsertCount: integer("bulk_insert_count").notNull().default(0),
  longestBulkInsertChars: integer("longest_bulk_insert_chars").notNull().default(0),
  rewriteSegments: integer("rewrite_segments").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  aiScore: doublePrecision("ai_score"),
  aiFlagged: boolean("ai_flagged"),
  diachronicScore: doublePrecision("diachronic_score"),
  diachronicFlagged: boolean("diachronic_flagged"),
  detectionRationale: text("detection_rationale"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceSessionsTable = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  weekNumber: integer("week_number"),
  topicId: integer("topic_id"),
  tutorEnabled: boolean("tutor_enabled").notNull().default(false),
  focusOnWeaknesses: boolean("focus_on_weaknesses").notNull().default(true),
  difficulty: doublePrecision("difficulty").notNull().default(2.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceProblemsTable = pgTable("practice_problems", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAttemptsTable = pgTable("practice_attempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => practiceProblemsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  trace: jsonb("trace"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Practice assignments (a generated, ungraded twin of a real assignment) ----
// Each generation is a fresh, single-use playable attempt. Problems are stored
// inline (answer/correct/feedback on the row) since each practice assignment is
// generated once and never reused.
export const practiceAssignmentsTable = pgTable("practice_assignments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  sourceAssignmentId: integer("source_assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // homework | test | midterm | final
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  scorePercent: doublePrecision("score_percent"),
  focusReport: jsonb("focus_report"), // { summary, readiness, pointers[], encouragement }
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const practiceAssignmentProblemsTable = pgTable("practice_assignment_problems", {
  id: serial("id").primaryKey(),
  practiceAssignmentId: integer("practice_assignment_id")
    .notNull()
    .references(() => practiceAssignmentsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Free-form dialogue about the feedback for a practice attempt (optionally scoped
// to a single problem via problemId).
export const practiceFeedbackMessagesTable = pgTable("practice_feedback_messages", {
  id: serial("id").primaryKey(),
  practiceAssignmentId: integer("practice_assignment_id")
    .notNull()
    .references(() => practiceAssignmentsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id"),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Diagnostic assessments (criterion-valid, full-subject parallel forms) ----
// Five graded slots (baseline + end of each of the 4 weeks) plus an unlimited
// free self-assessment. Every administration is a parallel form of the SAME
// fixed blueprint, so pre->post growth is measurable on one yardstick. The
// MEASURED score drives feedback/growth; the GRADE contribution is pass/fail by
// completion (submitting = pass). feedback is { overall, perDomain[], growth }.
export const assessmentInstancesTable = pgTable("assessment_instances", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  slot: text("slot").notNull(), // baseline | week1 | week2 | week3 | week4 | self
  kind: text("kind").notNull(), // graded | self
  title: text("title").notNull(),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  scorePercent: doublePrecision("score_percent"),
  passed: boolean("passed"),
  feedback: jsonb("feedback"), // { overall, perDomain[], growth }
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
});

export const assessmentProblemsTable = pgTable("assessment_problems", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id")
    .notNull()
    .references(() => assessmentInstancesTable.id, { onDelete: "cascade" }),
  domain: text("domain").notNull(), // blueprint domain key
  domainTitle: text("domain_title").notNull(),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  feedback: text("feedback"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Student-authored alternate versions of a lecture section, generated on demand
// from custom instructions. They stand ALONGSIDE the official short/medium/long
// bodies (never replace them) and are deletable at will.
export const lectureCustomVersionsTable = pgTable("lecture_custom_versions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  lectureId: integer("lecture_id")
    .notNull()
    .references(() => lecturesTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  instructions: text("instructions").notNull(),
  sourceText: text("source_text"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Evolving per-topic mastery profile. Updated by every graded submit, topic
// drill, and practice-assignment submit. emaAccuracy is an exponential moving
// average (recent performance weighted more) so the profile tracks growth.
export const topicProfileTable = pgTable(
  "topic_profile",
  {
    userId: text("user_id").notNull(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topicsTable.id, { onDelete: "cascade" }),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    emaAccuracy: doublePrecision("ema_accuracy").notNull().default(0.5),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);
