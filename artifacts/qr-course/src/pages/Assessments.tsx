import React, { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  useGetAssessmentsOverview,
  useStartAssessment,
  useStartSelfAssessment,
  useSaveAssessmentAnswer,
  useSubmitAssessment,
  getGetAssessmentsOverviewQueryKey,
  KeystrokeTrace,
  AssessmentInstance,
  AssessmentResult,
  AssessmentSlot,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  Lock,
  CheckCircle2,
  ClipboardCheck,
  TrendingUp,
  Sparkles,
  RotateCcw,
} from "lucide-react";

type View =
  | { kind: "overview" }
  | { kind: "taking"; instance: AssessmentInstance }
  | { kind: "result"; result: AssessmentResult };

export default function Assessments() {
  const qc = useQueryClient();
  const { data: overview, isLoading } = useGetAssessmentsOverview();
  const startGraded = useStartAssessment();
  const startSelf = useStartSelfAssessment();

  const [view, setView] = useState<View>({ kind: "overview" });
  const [error, setError] = useState<string | null>(null);

  function refreshOverview() {
    qc.invalidateQueries({ queryKey: getGetAssessmentsOverviewQueryKey() });
  }

  function beginGraded(slot: AssessmentSlot) {
    setError(null);
    startGraded.mutate(
      { slot: slot.slot },
      {
        onSuccess: (instance) => setView({ kind: "taking", instance }),
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  function beginSelf() {
    setError(null);
    startSelf.mutate(undefined, {
      onSuccess: (instance) => setView({ kind: "taking", instance }),
      onError: (e) => setError((e as Error).message),
    });
  }

  if (view.kind === "taking") {
    return (
      <TakeAssessment
        instance={view.instance}
        onDone={(result) => {
          refreshOverview();
          setView({ kind: "result", result });
        }}
        onCancel={() => {
          refreshOverview();
          setView({ kind: "overview" });
        }}
      />
    );
  }

  if (view.kind === "result") {
    return (
      <ResultView
        result={view.result}
        onBack={() => setView({ kind: "overview" })}
        onRetakeSelf={view.result.kind === "self" ? beginSelf : undefined}
        starting={startSelf.isPending}
      />
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8" />
            Diagnostic Assessments
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Full-subject diagnostics that measure your quantitative reasoning across every
            domain at once. Each administration is a brand-new parallel form — no two share
            the same questions. Completing all five graded diagnostics is worth{" "}
            <span className="font-semibold text-foreground">20% of your final grade</span>.
          </p>
        </header>

        {error && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-300 rounded-md px-4 py-3">
            {error}
          </div>
        )}

        {isLoading || !overview ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Graded diagnostics completed
                </div>
                <div className="text-3xl font-bold text-primary">
                  {overview.completed} / {overview.total}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Diagnostics grade bucket
                </div>
                <div className="text-3xl font-bold text-primary">
                  {Math.round(overview.bucketPercent)}%
                </div>
              </div>
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-serif font-semibold border-b pb-2">
                Graded diagnostics
              </h2>
              {overview.slots.map((slot) => (
                <SlotRow
                  key={slot.slot}
                  slot={slot}
                  onStart={() => beginGraded(slot)}
                  onView={(instanceId) => {
                    // Re-open a completed graded result via the result endpoint.
                    void openResult(instanceId, setView, setError);
                  }}
                  starting={startGraded.isPending}
                />
              ))}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-serif font-semibold border-b pb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Self-assessment (ungraded, unlimited)
              </h2>
              <div className="rounded-lg border border-border bg-card p-6 flex items-center justify-between flex-wrap gap-4">
                <div className="max-w-xl">
                  <p className="text-sm text-muted-foreground">
                    Take a full-subject diagnostic any time you want — these never count
                    toward your grade. Each one is a fresh parallel form with the same
                    per-domain feedback and growth tracking.
                  </p>
                  {overview.self.attempts > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You've taken {overview.self.attempts} self-assessment
                      {overview.self.attempts === 1 ? "" : "s"}.
                      {overview.self.lastScorePercent != null && (
                        <> Last score: {Math.round(overview.self.lastScorePercent)}%.</>
                      )}
                    </p>
                  )}
                </div>
                <Button onClick={beginSelf} disabled={startSelf.isPending}>
                  {startSelf.isPending ? "Generating…" : "Start a self-assessment"}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

async function openResult(
  instanceId: number,
  setView: (v: View) => void,
  setError: (e: string | null) => void,
) {
  try {
    const res = await fetch(`/api/assessments/instances/${instanceId}/result`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = (await res.json()) as AssessmentResult;
    setView({ kind: "result", result });
  } catch (e) {
    setError(`Couldn't load that result: ${(e as Error).message}`);
  }
}

function SlotRow({
  slot,
  onStart,
  onView,
  starting,
}: {
  slot: AssessmentSlot;
  onStart: () => void;
  onView: (instanceId: number) => void;
  starting: boolean;
}) {
  const submitted = slot.status === "submitted";
  const inProgress = slot.status === "in_progress";
  return (
    <div
      className={`rounded-lg border p-5 flex items-center justify-between gap-4 ${
        slot.locked
          ? "border-border bg-secondary/40 opacity-70"
          : submitted
            ? "border-chart-2/40 bg-chart-2/5"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-4">
        {slot.locked ? (
          <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : submitted ? (
          <CheckCircle2 className="w-5 h-5 text-chart-2 shrink-0" />
        ) : (
          <ClipboardCheck className="w-5 h-5 text-primary shrink-0" />
        )}
        <div>
          <div className="font-medium">{slot.title}</div>
          <div className="text-xs text-muted-foreground">
            {slot.locked
              ? (slot.unlockHint ?? "Locked")
              : submitted
                ? `Completed${
                    slot.scorePercent != null
                      ? ` · scored ${Math.round(slot.scorePercent)}%`
                      : ""
                  }`
                : inProgress
                  ? "In progress — resume where you left off"
                  : "Not started"}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        {slot.locked ? (
          <Button variant="outline" size="sm" disabled>
            Locked
          </Button>
        ) : submitted ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => slot.instanceId != null && onView(slot.instanceId)}
          >
            View result
          </Button>
        ) : (
          <Button size="sm" onClick={onStart} disabled={starting}>
            {starting ? "…" : inProgress ? "Resume" : "Start"}
          </Button>
        )}
      </div>
    </div>
  );
}

function TakeAssessment({
  instance,
  onDone,
  onCancel,
}: {
  instance: AssessmentInstance;
  onDone: (result: AssessmentResult) => void;
  onCancel: () => void;
}) {
  const saveAnswer = useSaveAssessmentAnswer();
  const submit = useSubmitAssessment();
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (const p of instance.problems) init[p.id] = p.answer ?? "";
    return init;
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleAnswerChange = (problemId: number, val: string, trace: KeystrokeTrace) => {
    setAnswers((prev) => ({ ...prev, [problemId]: val }));
    saveAnswer.mutate({ id: instance.id, data: { problemId, answer: val, trace } });
  };

  const handleSubmit = () => {
    setSubmitError(null);
    submit.mutate(
      { id: instance.id },
      {
        onSuccess: (result) => onDone(result),
        onError: (e) => setSubmitError((e as Error).message),
      },
    );
  };

  const current = instance.problems[currentIdx];
  const answered = instance.problems.filter((p) => (answers[p.id] ?? "").trim()).length;

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-6 pb-24">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">{instance.title}</h1>
            <p className="text-sm text-muted-foreground">
              Problem {currentIdx + 1} of {instance.problems.length} · {answered} answered ·
              full-subject diagnostic
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Save & exit
          </Button>
        </div>

        {submitError && (
          <div className="text-sm text-red-800 bg-red-50 border border-red-300 rounded-md px-4 py-3">
            {submitError}
          </div>
        )}

        {current ? (
          <div className="flex flex-col gap-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {current.domainTitle}
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none text-lg">
              <MarkdownRenderer content={current.prompt} />
            </div>
            {current.hint && (
              <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                Hint: {current.hint}
              </div>
            )}

            <AnswerInput
              value={answers[current.id] ?? ""}
              onChange={(val, trace) => handleAnswerChange(current.id, val, trace)}
              promptSource={current.prompt}
            />

            <div className="flex justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
              >
                Previous
              </Button>
              {currentIdx < instance.problems.length - 1 ? (
                <Button onClick={() => setCurrentIdx((p) => p + 1)}>Next</Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-chart-2 hover:bg-chart-2/90 text-white"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? "Scoring…" : "Submit diagnostic"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>Problem not found.</div>
        )}
      </div>
    </Layout>
  );
}

function ResultView({
  result,
  onBack,
  onRetakeSelf,
  starting,
}: {
  result: AssessmentResult;
  onBack: () => void;
  onRetakeSelf?: () => void;
  starting: boolean;
}) {
  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">
              Diagnostic results
            </h1>
            <p className="text-muted-foreground">
              Score: {Math.round(result.percent)}% ({result.score}/{result.total})
              {result.kind === "self" ? " · self-assessment, not counted toward your grade" : ""}
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            ← Back to assessments
          </Button>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 flex flex-col gap-4">
          <h2 className="text-xl font-serif font-semibold text-primary">Overall</h2>
          <div className="text-sm">
            <MarkdownRenderer content={result.feedback.overall} />
          </div>
          {result.feedback.growth && (
            <div className="flex items-start gap-2 text-sm border-t border-border pt-3">
              <TrendingUp className="w-4 h-4 text-chart-2 mt-0.5 shrink-0" />
              <span>{result.feedback.growth}</span>
            </div>
          )}
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-serif font-semibold border-b pb-2">By domain</h2>
          <div className="grid grid-cols-1 gap-3">
            {result.feedback.perDomain.map((d) => {
              const pct = d.total === 0 ? 0 : (d.correct / d.total) * 100;
              return (
                <div key={d.domain} className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{d.domainTitle}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {d.correct}/{d.total} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{d.comment}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-serif font-semibold border-b pb-2">
            Problem-by-problem
          </h2>
          {result.perProblem.map((pr) => (
            <div
              key={pr.problemId}
              className={`p-6 rounded-lg border ${
                pr.correct
                  ? "border-chart-2/50 bg-chart-2/5"
                  : "border-destructive/50 bg-destructive/5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">
                  Problem {pr.position} · {pr.domainTitle}
                </h3>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    pr.correct
                      ? "bg-chart-2/20 text-chart-2"
                      : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {pr.correct ? "Correct" : "Not yet"}
                </span>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm mb-4">
                <MarkdownRenderer content={pr.prompt} />
              </div>
              <div className="mb-3">
                <span className="text-sm font-semibold">Your answer:</span>
                <div className="font-mono mt-1">{pr.userAnswer || "No answer"}</div>
              </div>
              {!pr.correct && (
                <div className="mb-3 text-primary">
                  <span className="text-sm font-semibold">Correct answer:</span>
                  <div className="font-mono mt-1">{pr.correctAnswer}</div>
                </div>
              )}
              {pr.explanation && (
                <div className="rounded-md bg-card border border-border p-4">
                  <span className="text-sm font-semibold">Explanation:</span>
                  <div className="mt-1 text-sm">
                    <MarkdownRenderer content={pr.explanation} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack}>
            ← Back to assessments
          </Button>
          {onRetakeSelf && (
            <Button onClick={onRetakeSelf} disabled={starting}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {starting ? "Generating…" : "Take another self-assessment"}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
