import { Link } from "wouter";
import {
  GraduationCap,
  BookOpen,
  MessagesSquare,
  Target,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Three-depth lectures",
    body: "Read every lecture short, medium, or long — rewritten on demand while keeping the same examples and learning objectives.",
  },
  {
    icon: MessagesSquare,
    title: "Section-scoped AI tutor",
    body: "Ask about the exact paragraph you're reading and get an answer streamed back, grounded in that lecture section.",
  },
  {
    icon: Target,
    title: "Adaptive practice",
    body: "Problem sets that get harder after a streak and easier after a miss, with an explanation on every answer.",
  },
  {
    icon: ShieldCheck,
    title: "AI-graded & integrity-checked",
    body: "Homework, tests, a midterm, and a final scored by an AI grader and screened by two layers of AI-authorship detection.",
  },
  {
    icon: BarChart3,
    title: "Live analytics",
    body: "Per-topic mastery, accuracy, and streaks — so your progress and weak spots are always visible at a glance.",
  },
  {
    icon: GraduationCap,
    title: "A full month of QR",
    body: "Four weeks across 28 topics: proportional reasoning, statistics, probability, modeling, financial math, and inference.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
            QR
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight">
            Quantitative Reasoning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <button className="px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors">
              Sign in
            </button>
          </Link>
          <Link href="/sign-up">
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Get started
            </button>
          </Link>
        </div>
      </header>

      <main>
        <section className="px-6 py-20 md:px-12 md:py-28 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/60 text-xs font-medium text-muted-foreground mb-6">
            <GraduationCap className="w-3.5 h-3.5" />
            A four-week college Quantitative Reasoning course
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Learn it. Practice it.
            <br />
            Prove you understand it.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            A self-paced QR course that teaches, tutors, drills, and grades
            itself — with your own private progress, assessments, and practice.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/sign-up">
              <button className="px-6 py-3 rounded-md text-base font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Create your account
              </button>
            </Link>
            <Link href="/sign-in">
              <button className="px-6 py-3 rounded-md text-base font-semibold border border-border hover:bg-secondary transition-colors">
                Sign in
              </button>
            </Link>
          </div>
        </section>

        <section className="px-6 pb-24 md:px-12 max-w-6xl mx-auto">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-serif font-semibold text-lg mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-6 md:px-12 text-center text-xs text-muted-foreground">
        Quantitative Reasoning · Sign in to access your course
      </footer>
    </div>
  );
}
