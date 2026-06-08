import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import {
  useGeneratePracticeAssignment,
  useSavePracticeAssignmentAnswer,
  useSubmitPracticeAssignment,
  usePracticeFeedbackChat,
  useGetPracticeFeedbackMessages,
  useAskTutor,
  KeystrokeTrace,
  PracticeAssignmentPlayable,
  PracticeAssignmentResult,
  PracticeProblemResult,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Send } from "lucide-react";

type ChatMsg = { role: "user" | "tutor"; text: string };

export default function PracticeAssignment() {
  const params = useParams();
  const sourceId = Number(params.sourceId);

  const generate = useGeneratePracticeAssignment();
  const saveAnswer = useSavePracticeAssignmentAnswer();
  const submit = useSubmitPracticeAssignment();

  const [practice, setPractice] = useState<PracticeAssignmentPlayable | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [result, setResult] = useState<PracticeAssignmentResult | null>(null);
  const startedRef = useRef(false);

  const startPractice = React.useCallback(() => {
    startedRef.current = true;
    setPractice(null);
    setResult(null);
    setAnswers({});
    setCurrentIdx(0);
    generate.mutate(
      { data: { sourceAssignmentId: sourceId } },
      {
        onSuccess: (data) => setPractice(data),
      },
    );
  }, [generate, sourceId]);

  useEffect(() => {
    if (!Number.isFinite(sourceId) || startedRef.current) return;
    startPractice();
  }, [sourceId, startPractice]);

  const handleAnswerChange = (problemId: number, val: string, trace: KeystrokeTrace) => {
    setAnswers((prev) => ({ ...prev, [problemId]: val }));
    if (practice) {
      saveAnswer.mutate({ id: practice.id, data: { problemId, answer: val, trace } });
    }
  };

  const handleSubmit = () => {
    if (!practice) return;
    submit.mutate(
      { id: practice.id },
      { onSuccess: (data) => setResult(data) },
    );
  };

  // ---- Results view ----
  if (result && practice) {
    return (
      <Layout>
        <div className="flex h-full min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-primary mb-2">
                    {practice.title} — Practice Results
                  </h1>
                  <p className="text-muted-foreground">
                    Score: {Math.round(result.percent)}% ({result.score}/{result.total}) ·
                    practice only, never counted against you
                  </p>
                </div>
              </div>

              <FocusReportPanel result={result} sourceId={sourceId} onGenerateAnother={startPractice} generating={generate.isPending} />

              <div className="flex flex-col gap-6">
                <h2 className="text-xl font-serif font-semibold border-b pb-2">
                  Problem-by-problem feedback
                </h2>
                {result.perProblem.map((pr) => (
                  <ProblemFeedbackCard key={pr.problemId} pr={pr} />
                ))}
              </div>
            </div>
          </div>

          <div className="w-[420px] shrink-0 border-l border-border flex flex-col min-h-0 bg-background">
            <div className="border-b border-border p-3">
              <div className="font-serif font-semibold">Talk through your feedback</div>
              <div className="text-xs text-muted-foreground">
                Ask the tutor anything about how you did and what to fix.
              </div>
            </div>
            <FeedbackChatPane practiceId={practice.id} />
          </div>
        </div>
      </Layout>
    );
  }

  // ---- Loading / generating ----
  if (generate.isPending || !practice) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
          <h1 className="text-2xl font-serif font-bold text-primary">
            Generating a fresh practice set…
          </h1>
          <p className="text-muted-foreground">
            Brand-new problems, never repeated, never the same as the graded version.
          </p>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  const currentProblem = practice.problems[currentIdx];

  return (
    <Layout>
      <div className="flex h-full min-h-0">
        {/* LEFT: problem + answer */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-3xl mx-auto w-full flex flex-col gap-6 pb-24">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h1 className="text-2xl font-serif font-bold text-primary">
                  {practice.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Problem {currentIdx + 1} of {practice.problems.length} · practice — the
                  tutor is here to help while you work
                </p>
              </div>
              <Link href={`/assignments/${sourceId}`}>
                <Button variant="outline" size="sm">
                  I'm ready for the graded version →
                </Button>
              </Link>
            </div>

            {currentProblem ? (
              <div className="flex flex-col gap-8">
                <div className="prose prose-slate dark:prose-invert max-w-none text-lg">
                  <MarkdownRenderer content={currentProblem.prompt} />
                </div>

                <AnswerInput
                  value={answers[currentProblem.id] || ""}
                  onChange={(val, trace) => handleAnswerChange(currentProblem.id, val, trace)}
                  promptSource={currentProblem.prompt}
                />

                <div className="flex justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                    disabled={currentIdx === 0}
                  >
                    Previous
                  </Button>
                  {currentIdx < practice.problems.length - 1 ? (
                    <Button onClick={() => setCurrentIdx((p) => p + 1)}>Next</Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      className="bg-chart-2 hover:bg-chart-2/90 text-white"
                      disabled={submit.isPending}
                    >
                      {submit.isPending ? "Scoring practice…" : "Submit practice for feedback"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div>Problem not found.</div>
            )}
          </div>
        </div>

        {/* RIGHT: live tutor (stays on screen during practice) */}
        <div className="w-[420px] shrink-0 border-l border-border flex flex-col min-h-0 bg-background">
          <div className="border-b border-border p-3">
            <div className="font-serif font-semibold">Live tutor</div>
            <div className="text-xs text-muted-foreground">
              Stuck? Ask about the problem you're on — grounded in this exact question.
            </div>
          </div>
          <LiveTutorPane problemPrompt={currentProblem?.prompt ?? ""} />
        </div>
      </div>
    </Layout>
  );
}

/* ---------- Focus report ---------- */
function FocusReportPanel({
  result,
  sourceId,
  onGenerateAnother,
  generating,
}: {
  result: PracticeAssignmentResult;
  sourceId: number;
  onGenerateAnother: () => void;
  generating: boolean;
}) {
  const fr = result.focusReport;
  const readiness = Math.round(fr.readiness);
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-semibold text-primary">Your focus report</h2>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Readiness for graded
          </div>
          <div className="text-2xl font-bold text-primary">{readiness}%</div>
        </div>
      </div>

      {fr.summary && (
        <div className="text-sm">
          <MarkdownRenderer content={fr.summary} />
        </div>
      )}

      {fr.pointers.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Exactly what to work on, worst first
          </div>
          {fr.pointers.map((p, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold">{p.topicTitle}</span>
                {p.masteryPercent != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    mastery {Math.round(p.masteryPercent)}%
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <MarkdownRenderer content={p.issue} />
              </div>
              <div className="text-sm">
                <span className="font-semibold text-primary">Do this: </span>
                <MarkdownRenderer content={p.action} />
              </div>
            </div>
          ))}
        </div>
      )}

      {fr.encouragement && (
        <div className="text-sm italic text-muted-foreground border-t border-border pt-3">
          {fr.encouragement}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button onClick={onGenerateAnother} disabled={generating}>
          {generating ? "Generating…" : "Practice another fresh set →"}
        </Button>
        <Link href={`/assignments/${sourceId}`}>
          <Button variant="outline">I'm ready — take the graded version</Button>
        </Link>
      </div>
    </div>
  );
}

function ProblemFeedbackCard({ pr }: { pr: PracticeProblemResult }) {
  return (
    <div
      className={`p-6 rounded-lg border ${
        pr.correct
          ? "border-chart-2/50 bg-chart-2/5"
          : "border-destructive/50 bg-destructive/5"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">
          Problem {pr.position}
          {pr.topicTitle ? ` · ${pr.topicTitle}` : ""}
        </h3>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            pr.correct ? "bg-chart-2/20 text-chart-2" : "bg-destructive/20 text-destructive"
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
      <div className="rounded-md bg-card border border-border p-4">
        <span className="text-sm font-semibold">Feedback:</span>
        <div className="mt-1 text-sm">
          <MarkdownRenderer content={pr.feedback} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Feedback dialogue (post-submit) ---------- */
function FeedbackChatPane({ practiceId }: { practiceId: number }) {
  const { data: history, refetch } = useGetPracticeFeedbackMessages(practiceId, {
    query: { queryKey: ["practice-feedback-messages", practiceId] },
  });
  const chat = usePracticeFeedbackChat();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [history?.length, pending.length, chat.isPending]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setPending((p) => [...p, { role: "user", text }]);
    chat.mutate(
      { id: practiceId, data: { message: text } },
      {
        onSuccess: () => {
          refetch().finally(() => setPending([]));
        },
        onError: (e) => {
          setPending((p) => [
            ...p,
            { role: "tutor", text: `Tutor error: ${(e as Error).message}` },
          ]);
        },
      },
    );
  };

  const merged: ChatMsg[] = [
    ...(history ?? []).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("tutor" as const),
      text: m.content,
    })),
    ...pending,
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {merged.length === 0 && (
          <div className="m-auto text-center text-sm text-muted-foreground italic max-w-xs">
            Disagree with a mark? Want a worked example of one you missed? Ask away.
          </div>
        )}
        {merged.map((m, i) => (
          <div key={i} className={`max-w-[92%] ${m.role === "user" ? "self-end" : "self-start"}`}>
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              <MarkdownRenderer content={m.text} inverted={m.role === "user"} />
            </div>
          </div>
        ))}
        {chat.isPending && (
          <div className="self-start px-3 py-2 rounded-lg bg-card border border-border text-sm animate-pulse text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about your feedback…"
          rows={3}
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px] max-h-[200px]"
        />
        <Button size="lg" onClick={send} disabled={!input.trim() || chat.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Live tutor (during practice) ---------- */
function LiveTutorPane({ problemPrompt }: { problemPrompt: string }) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const ask = useAskTutor();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [history.length, ask.isPending]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", text }]);
    ask.mutate(
      {
        data: {
          message: text,
          selectedLectureText: problemPrompt || undefined,
        },
      },
      {
        onSuccess: (res) => setHistory((h) => [...h, { role: "tutor", text: res.text }]),
        onError: (e) =>
          setHistory((h) => [...h, { role: "tutor", text: `Tutor error: ${(e as Error).message}` }]),
      },
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {history.length === 0 && (
          <div className="m-auto text-center text-sm text-muted-foreground italic max-w-xs">
            Ask for a hint, a nudge, or a worked example for a similar problem — without
            giving away this exact answer.
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`max-w-[92%] ${m.role === "user" ? "self-end" : "self-start"}`}>
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border"
              }`}
            >
              <MarkdownRenderer content={m.text} inverted={m.role === "user"} />
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="self-start px-3 py-2 rounded-lg bg-card border border-border text-sm animate-pulse text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask the tutor about this problem…"
          rows={3}
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[72px] max-h-[200px]"
        />
        <Button size="lg" onClick={send} disabled={!input.trim() || ask.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
