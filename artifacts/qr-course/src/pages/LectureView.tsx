import { useEffect, useMemo, useRef, useState } from "react";
import {
  useGetLecture,
  getGetLectureQueryKey,
  useAskTutor,
  useStartPracticeSession,
  useNextPracticeProblem,
  useGradePracticeAnswer,
  type PracticeProblem,
  type PracticeGrade,
  type KeystrokeTrace,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AnswerInput } from "@/components/AnswerInput";
import { StarterQuestionCard } from "@/components/StarterQuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Sparkles, Send, X, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type ChatMsg = { role: "user" | "tutor"; text: string };

export default function LectureView() {
  const params = useParams();
  const lectureId = Number(params.lectureId);
  const { data: lecture, isLoading } = useGetLecture(lectureId);

  // shared selected-text state (used by both Tutor and Practice)
  const [selectedText, setSelectedText] = useState("");
  const articleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onSelect() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;
      // only capture selections that are inside the article
      if (!articleRef.current) return;
      const anchor = sel.anchorNode;
      if (anchor && articleRef.current.contains(anchor)) {
        setSelectedText(text.slice(0, 800));
      }
    }
    document.addEventListener("mouseup", onSelect);
    document.addEventListener("keyup", onSelect);
    return () => {
      document.removeEventListener("mouseup", onSelect);
      document.removeEventListener("keyup", onSelect);
    };
  }, []);

  const [tab, setTab] = useState<"tutor" | "practice">("tutor");
  const [level, setLevel] = useState<"short" | "medium" | "long">("short");

  const qc = useQueryClient();
  const [generatingLevel, setGeneratingLevel] = useState<"medium" | "long" | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Tracks the lecture currently displayed, readable from inside async closures
  // so an in-flight generation can tell if the user has since navigated away.
  const currentLectureIdRef = useRef(lectureId);
  currentLectureIdRef.current = lectureId;

  // Reset depth selection + generation state whenever we switch lectures, so a
  // generation started on one lecture can't leak its UI state into another.
  useEffect(() => {
    setLevel("short");
    setGeneratingLevel(null);
    setGenerateError(null);
  }, [lectureId]);

  const availableLevels = useMemo(() => {
    const out: Array<"short" | "medium" | "long"> = ["short"];
    if (lecture?.bodyMedium) out.push("medium");
    if (lecture?.bodyLong) out.push("long");
    return out;
  }, [lecture?.bodyMedium, lecture?.bodyLong]);

  async function generateLevel(lvl: "medium" | "long") {
    if (generatingLevel) return;
    const startedFor = lectureId;
    setGenerateError(null);
    setGeneratingLevel(lvl);
    try {
      const res = await fetch(
        `/api/diagnostics/expand-lectures?level=${lvl}&id=${startedFor}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { updated?: number; failed?: number };
      if (!data.updated) throw new Error("generation did not return content");
      // Always refresh the lecture we generated for, even if the user navigated away.
      await qc.invalidateQueries({ queryKey: getGetLectureQueryKey(startedFor) });
      // Only mutate UI state if we're still on the lecture we started from.
      if (startedFor === currentLectureIdRef.current) setLevel(lvl);
    } catch (e) {
      if (startedFor === currentLectureIdRef.current) {
        setGenerateError(`Couldn't generate the ${lvl} version: ${(e as Error).message}`);
      }
    } finally {
      if (startedFor === currentLectureIdRef.current) setGeneratingLevel(null);
    }
  }

  function onLevelClick(lvl: "short" | "medium" | "long") {
    if (availableLevels.includes(lvl)) {
      setLevel(lvl);
    } else if (lvl === "medium" || lvl === "long") {
      void generateLevel(lvl);
    }
  }

  const activeBody =
    level === "long" && lecture?.bodyLong
      ? lecture.bodyLong
      : level === "medium" && lecture?.bodyMedium
        ? lecture.bodyMedium
        : (lecture?.body ?? "");

  return (
    <Layout>
      <div className="px-6 pt-4 pb-2">
        <Link href={lecture ? `/weeks/${lecture.weekNumber}` : "/"}>
          <Button variant="ghost" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Week {lecture?.weekNumber ?? ""}
          </Button>
        </Link>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* LEFT: lecture */}
        <div className="overflow-y-auto px-8 pb-16 border-r border-border">
          {isLoading ? (
            <div className="flex flex-col gap-6 mt-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : lecture ? (
            <article>
              <header className="mb-6 mt-2">
                <h1 className="text-3xl font-serif font-bold text-primary mb-3 leading-tight">
                  {lecture.title}
                </h1>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Week {lecture.weekNumber}
                  </div>
                  <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                    {(["short", "medium", "long"] as const).map((lvl) => {
                      const enabled = availableLevels.includes(lvl);
                      const active = level === lvl;
                      const isGenerating = generatingLevel === lvl;
                      const busy = generatingLevel !== null;
                      const label = lvl[0].toUpperCase() + lvl.slice(1);
                      return (
                        <button
                          key={lvl}
                          onClick={() => !busy && onLevelClick(lvl)}
                          disabled={busy}
                          title={
                            enabled
                              ? `${label} version`
                              : `Generate the ${label} version of this lecture now`
                          }
                          className={`px-3 py-1.5 font-medium uppercase tracking-wider transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : enabled
                                ? "bg-background hover:bg-secondary text-foreground"
                                : busy
                                  ? "bg-background/50 text-muted-foreground/50 cursor-wait"
                                  : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                          data-testid={`button-level-${lvl}`}
                        >
                          {isGenerating ? "Generating…" : enabled ? lvl : `+ ${lvl}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </header>
              {generateError && (
                <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-300 rounded-md px-3 py-2">
                  {generateError}
                </div>
              )}
              <div className="bg-card border shadow-sm rounded-lg p-6 md:p-8" ref={articleRef}>
                <MarkdownRenderer content={activeBody} />
                <div className="mt-6 pt-4 border-t border-dashed border-border text-xs text-muted-foreground italic">
                  Tip: highlight any passage above to ask the tutor about it, or to generate practice problems specifically on what you selected.
                </div>
              </div>
            </article>
          ) : (
            <div className="mt-8">Lecture not found.</div>
          )}
        </div>

        {/* RIGHT: practice + tutor */}
        <div className="flex flex-col min-h-0 bg-secondary/20">
          <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("tutor")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                  tab === "tutor" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
                data-testid="tab-tutor"
              >
                <MessageSquare className="w-4 h-4" />
                Ask the tutor
              </button>
              <button
                onClick={() => setTab("practice")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                  tab === "practice" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                }`}
                data-testid="tab-practice"
              >
                <Sparkles className="w-4 h-4" />
                Practice on this
              </button>
            </div>
            {selectedText && (
              <button
                onClick={() => setSelectedText("")}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> clear selection
              </button>
            )}
          </div>

          {selectedText && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
              <div className="font-semibold mb-0.5">Using your highlighted text:</div>
              <div className="line-clamp-2 italic">"{selectedText}"</div>
            </div>
          )}

          {tab === "tutor" ? (
            <TutorPane
              lectureId={lecture?.id ?? null}
              selectedText={selectedText}
              onUsedSelection={() => {/* keep selection visible */}}
            />
          ) : (
            <PracticePane
              lectureId={lecture?.id ?? null}
              topicId={lecture?.topicId ?? null}
              weekNumber={lecture?.weekNumber ?? null}
              selectedText={selectedText}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ============ Tutor pane ============ */
function TutorPane({
  lectureId,
  selectedText,
  onUsedSelection,
}: {
  lectureId: number | null;
  selectedText: string;
  onUsedSelection: () => void;
}) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const ask = useAskTutor();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Preloaded starter questions for this lecture
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (lectureId == null) return;
    setSuggestions(null);
    setSuggestionsDismissed(false);
    setDismissed(new Set());
    setSuggestionsLoading(true);
    fetch(`/api/tutor/suggestions/${lectureId}`)
      .then((r) => r.json())
      .then((data: { questions?: string[] }) => {
        setSuggestions(data.questions ?? []);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }, [lectureId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [history.length, ask.isPending]);

  const placeholder = selectedText
    ? "Ask about the highlighted passage…"
    : "Ask anything about this lecture… (Shift+Enter for newline)";

  function sendMessage(msg: string) {
    const text = msg.trim();
    if (!text) return;
    setHistory((h) => [...h, { role: "user", text }]);
    ask.mutate(
      {
        data: {
          message: text,
          lectureId: lectureId ?? undefined,
          selectedLectureText: selectedText || undefined,
        },
      },
      {
        onSuccess: (res) => {
          setHistory((h) => [...h, { role: "tutor", text: res.text }]);
          onUsedSelection();
        },
        onError: (e) => {
          setHistory((h) => [
            ...h,
            { role: "tutor", text: `Tutor error: ${(e as Error).message}` },
          ]);
        },
      },
    );
  }

  function send() {
    const msg = input.trim();
    if (!msg) return;
    setInput("");
    sendMessage(msg);
  }

  function submitAttempt(question: string, attempt: string) {
    const a = attempt.trim();
    if (!a) return;
    const prompt =
      `I'm trying to answer this starter question myself before you explain.\n\n` +
      `QUESTION: ${question}\n\n` +
      `MY ANSWER: ${a}\n\n` +
      `Please (1) tell me clearly whether my answer is correct, partly correct, or wrong; ` +
      `(2) point to the specific part of my reasoning that's right or off; ` +
      `(3) then give the full correct answer with a brief worked example. ` +
      `Keep it tight — don't restate the lecture.`;
    sendMessage(prompt);
  }

  const visibleSuggestions = (suggestions ?? []).filter((_, i) => !dismissed.has(i));
  const showSuggestions =
    !suggestionsDismissed && (suggestionsLoading || visibleSuggestions.length > 0);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border bg-background p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={placeholder}
          rows={4}
          className="flex-1 bg-secondary border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[96px] max-h-[280px]"
          data-testid="input-tutor-question"
        />
        <Button size="lg" onClick={send} disabled={!input.trim() || ask.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {showSuggestions && (
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Starter questions for this section
              </div>
              <button
                onClick={() => setSuggestionsDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                data-testid="button-dismiss-all-suggestions"
              >
                <X className="w-3 h-3" /> dismiss all
              </button>
            </div>
            {suggestionsLoading ? (
              <div className="text-sm text-muted-foreground italic">
                Generating starter questions…
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(suggestions ?? []).map((q, i) => {
                  if (dismissed.has(i)) return null;
                  return (
                    <StarterQuestionCard
                      key={i}
                      index={i}
                      question={q}
                      pending={ask.isPending}
                      onSubmitAttempt={(attempt) => submitAttempt(q, attempt)}
                      onShowAnswer={() => sendMessage(q)}
                      onDismiss={() =>
                        setDismissed((d) => {
                          const n = new Set(d);
                          n.add(i);
                          return n;
                        })
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {history.length === 0 && !showSuggestions && (
          <div className="m-auto text-center text-sm text-muted-foreground italic max-w-sm">
            Ask the tutor for an explanation, a worked example, or a hint. Highlight a passage on the left to ground the question in that text.
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
    </div>
  );
}

/* ============ Practice pane (inline, scoped to this lecture's topic) ============ */
function PracticePane({
  lectureId,
  topicId,
  weekNumber,
  selectedText,
}: {
  lectureId: number | null;
  topicId: number | null;
  weekNumber: number | null;
  selectedText: string;
}) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [trace, setTrace] = useState<KeystrokeTrace>({
    keystrokeCount: 0,
    eraseCount: 0,
    durationMs: 0,
  });

  const start = useStartPracticeSession();
  const next = useNextPracticeProblem();
  const grader = useGradePracticeAnswer();

  // auto-start a session scoped to this lecture's topic
  useEffect(() => {
    if (sessionId != null || topicId == null) return;
    start.mutate(
      {
        data: {
          tutorEnabled: true,
          focusOnWeaknesses: false,
          topicId,
          weekNumber: weekNumber ?? undefined,
        },
      },
      {
        onSuccess: (s) => {
          setSessionId(s.id);
          loadNext(s.id);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const requestText = useMemo(() => {
    return selectedText
      ? `Make a problem that drills exactly this passage from the lecture:\n"""${selectedText}"""`
      : "";
  }, [selectedText]);

  function loadNext(sid: number) {
    setAnswer("");
    setGrade(null);
    setTrace({ keystrokeCount: 0, eraseCount: 0, durationMs: 0 });
    setProblem(null);
    next.mutate(
      {
        sessionId: sid,
        data: { topicId: topicId ?? undefined, request: requestText || undefined },
      },
      { onSuccess: (p) => setProblem(p) },
    );
  }

  function submit() {
    if (!sessionId || !problem) return;
    grader.mutate(
      { sessionId, data: { problemId: problem.id, answer, trace } },
      { onSuccess: (r) => setGrade(r) },
    );
  }

  if (topicId == null) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-8">
        Loading lecture…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Practice · {problem?.topicTitle ?? "this lecture"}
            {problem?.difficulty != null && (
              <span className="ml-2 normal-case font-normal">
                · difficulty {problem.difficulty.toFixed(1)}/5
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => sessionId && loadNext(sessionId)}
            disabled={next.isPending || grader.isPending}
            data-testid="button-new-problem"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            New problem
          </Button>
        </div>

        {selectedText && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2">
            The next problem you generate will be drilled specifically on the passage you highlighted. Click <strong>New problem</strong> to regenerate.
          </div>
        )}

        <div className="bg-card border rounded-lg p-4 min-h-[120px]">
          {next.isPending || !problem ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <MarkdownRenderer content={problem.prompt} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <AnswerInput
            value={answer}
            onChange={(val, t) => {
              setAnswer(val);
              setTrace(t);
            }}
            disabled={!!grade || !problem}
            promptSource={problem?.prompt}
          />
        </div>

        {grade ? (
          <div
            className={`rounded-md border p-3 ${
              grade.correct
                ? "bg-emerald-50 border-emerald-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-semibold mb-2 ${
                grade.correct ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {grade.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {grade.correct ? "Correct" : "Not quite"}
            </div>
            <div className="text-sm prose prose-sm max-w-none">
              <MarkdownRenderer content={grade.explanation} />
            </div>
            {grade.tutorTip && (
              <div className="mt-2 pt-2 border-t border-border/60 text-sm italic text-muted-foreground">
                Tutor tip: {grade.tutorTip}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => sessionId && loadNext(sessionId)}
                disabled={next.isPending}
                data-testid="button-next-after-grade"
              >
                Next problem
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={!answer.trim() || grader.isPending || !problem}
              data-testid="button-submit-practice"
            >
              {grader.isPending ? "Grading…" : "Submit answer"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
