import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetAssignment,
  useGenerateAssignmentPractice,
  useGradePracticeWithFeedback,
  useDiscussPracticeProblem,
  type AssignmentPracticeSet,
  type PracticeFeedback,
  type PracticeDiscussTurn,
  type KeystrokeTrace,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { TutorPane } from "@/components/TutorPane";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Send,
  MessageSquare,
  GraduationCap,
} from "lucide-react";

const emptyTrace: KeystrokeTrace = {
  keystrokeCount: 0,
  eraseCount: 0,
  durationMs: 0,
};

export default function PracticeAssignment() {
  const params = useParams();
  const assignmentId = Number(params.id);

  const { data: assignment } = useGetAssignment(assignmentId);
  const generate = useGenerateAssignmentPractice();
  const [set, setSet] = useState<AssignmentPracticeSet | null>(null);

  function generateSet() {
    generate.mutate(
      { assignmentId },
      { onSuccess: (s) => setSet(s) },
    );
  }

  useEffect(() => {
    if (!Number.isNaN(assignmentId)) generateSet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  return (
    <Layout>
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <Link href="/assignments">
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>
        <Link href={`/assignments/${assignmentId}`}>
          <Button variant="outline" size="sm">
            <GraduationCap className="w-4 h-4 mr-2" />
            Take the graded version
          </Button>
        </Link>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* LEFT: practice problems */}
        <div className="overflow-y-auto px-6 pb-16 border-r border-border">
          <header className="mb-5 mt-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              <Sparkles className="w-4 h-4" />
              Practice mode
            </div>
            <h1 className="text-2xl font-serif font-bold text-primary leading-tight">
              {assignment?.title ?? "Practice"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              This is unlimited, ungraded practice that mirrors the real assignment. Get
              rich feedback on every answer, talk it through with the tutor, and generate a
              fresh set as many times as you want. Nothing here counts toward your grade.
            </p>
          </header>

          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-muted-foreground">
              {set ? `${set.problems.length} practice problems` : "Generating practice set…"}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={generateSet}
              disabled={generate.isPending}
              data-testid="button-generate-set"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${generate.isPending ? "animate-spin" : ""}`} />
              Generate another set
            </Button>
          </div>

          {generate.isPending && !set ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : set ? (
            <div className="flex flex-col gap-6">
              {set.problems.map((p, idx) => (
                <PracticeProblemCard
                  key={p.id}
                  index={idx}
                  sessionId={set.sessionId}
                  problemId={p.id}
                  prompt={p.prompt}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mt-8">
              Couldn't generate a practice set.{" "}
              <button className="underline" onClick={generateSet}>
                Try again
              </button>
              .
            </div>
          )}
        </div>

        {/* RIGHT: live tutor */}
        <div className="flex flex-col min-h-0 bg-secondary/20">
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5 text-sm font-medium">
            <MessageSquare className="w-4 h-4 text-primary" />
            Live tutor — here to help while you practice
          </div>
          <TutorPane
            lectureId={null}
            emptyHint="Stuck on a practice problem? Ask the tutor for a hint, a worked example, or to explain a concept. The tutor is only here in practice — it's hidden during the graded assignment."
          />
        </div>
      </div>
    </Layout>
  );
}

/* ============ One practice problem with feedback + discuss chat ============ */
function PracticeProblemCard({
  index,
  sessionId,
  problemId,
  prompt,
}: {
  index: number;
  sessionId: number;
  problemId: number;
  prompt: string;
}) {
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<KeystrokeTrace>(emptyTrace);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);

  const grade = useGradePracticeWithFeedback();

  function submit() {
    grade.mutate(
      { sessionId, data: { problemId, answer, trace } },
      { onSuccess: (r) => setFeedback(r) },
    );
  }

  function retry() {
    setFeedback(null);
    setAnswer("");
    setTrace(emptyTrace);
  }

  return (
    <div className="bg-card border rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
          {index + 1}
        </span>
        <div className="prose prose-slate max-w-none text-[15px] leading-relaxed">
          <MarkdownRenderer content={prompt} />
        </div>
      </div>

      <AnswerInput
        value={answer}
        onChange={(val, t) => {
          setAnswer(val);
          setTrace(t);
        }}
        disabled={!!feedback}
        prose
      />

      {feedback ? (
        <div
          className={`rounded-md border p-4 ${
            feedback.correct
              ? "bg-emerald-50 border-emerald-300"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div
            className={`flex items-center gap-2 font-semibold mb-2 ${
              feedback.correct ? "text-emerald-800" : "text-amber-900"
            }`}
          >
            {feedback.correct ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {feedback.correct ? "Strong answer" : "Not quite there yet"}
          </div>
          <div className="text-sm prose prose-sm prose-slate max-w-none">
            <MarkdownRenderer content={feedback.feedback} />
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
              Show a model answer
            </summary>
            <div className="mt-2 prose prose-sm prose-slate max-w-none">
              <MarkdownRenderer content={feedback.modelAnswer} />
            </div>
          </details>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={retry} data-testid="button-retry">
              <RefreshCw className="w-4 h-4 mr-1" />
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={!answer.trim() || grade.isPending}
            data-testid="button-submit-practice"
          >
            {grade.isPending ? "Checking…" : "Check my answer"}
          </Button>
        </div>
      )}

      <DiscussChat sessionId={sessionId} problemId={problemId} />
    </div>
  );
}

/* ============ Per-problem feedback dialogue ============ */
function DiscussChat({
  sessionId,
  problemId,
}: {
  sessionId: number;
  problemId: number;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<PracticeDiscussTurn[]>([]);
  const [input, setInput] = useState("");
  const discuss = useDiscussPracticeProblem();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [history.length, discuss.isPending]);

  function send() {
    const message = input.trim();
    if (!message) return;
    const nextHistory: PracticeDiscussTurn[] = [
      ...history,
      { role: "user", content: message },
    ];
    setHistory(nextHistory);
    setInput("");
    discuss.mutate(
      { sessionId, data: { problemId, message, history } },
      {
        onSuccess: (r) =>
          setHistory((h) => [...h, { role: "assistant", content: r.reply }]),
        onError: (e) =>
          setHistory((h) => [
            ...h,
            { role: "assistant", content: `Tutor error: ${(e as Error).message}` },
          ]),
      },
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start text-sm text-primary hover:underline inline-flex items-center gap-1.5"
        data-testid="button-open-discuss"
      >
        <MessageSquare className="w-4 h-4" />
        Discuss this problem with the tutor
      </button>
    );
  }

  return (
    <div className="border-t border-dashed border-border pt-3 flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Discussion about this problem
      </div>
      <div ref={scrollRef} className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {history.length === 0 && (
          <div className="text-sm text-muted-foreground italic">
            Ask for a hint, push back on the feedback, or ask why your answer was marked
            the way it was.
          </div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] ${m.role === "user" ? "self-end" : "self-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-border"
              }`}
            >
              <MarkdownRenderer content={m.content} inverted={m.role === "user"} />
            </div>
          </div>
        ))}
        {discuss.isPending && (
          <div className="self-start px-3 py-2 rounded-lg bg-secondary border border-border text-sm animate-pulse text-muted-foreground">
            Thinking…
          </div>
        )}
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about this problem…"
          rows={2}
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[48px] max-h-[160px]"
          data-testid="input-discuss"
        />
        <Button onClick={send} disabled={!input.trim() || discuss.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
