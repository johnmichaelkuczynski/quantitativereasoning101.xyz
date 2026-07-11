import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LogIn } from "lucide-react";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Assignments from "@/pages/Assignments";
import Assessments from "@/pages/Assessments";
import Analytics from "@/pages/Analytics";
import WeekView from "@/pages/WeekView";
import LectureView from "@/pages/LectureView";
import AssignmentRunner from "@/pages/AssignmentRunner";
import PracticeAssignment from "@/pages/PracticeAssignment";
import Diagnostics from "@/pages/Diagnostics";
import TopicPractice from "@/pages/TopicPractice";
import Administrative from "@/pages/Administrative";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/assignments/:id" component={AssignmentRunner} />
      <Route path="/assessments" component={Assessments} />
      <Route path="/practice-assignment/:sourceId" component={PracticeAssignment} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/administrative" component={Administrative} />
      <Route path="/diagnostics" component={Diagnostics} />
      <Route path="/weeks/:weekNumber" component={WeekView} />
      <Route path="/lectures/:lectureId" component={LectureView} />
      <Route path="/practice/topic/:topicId" component={TopicPractice} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SignInScreen() {
  const authFailed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "auth_failed";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-serif font-bold text-2xl">
            QR
          </div>
          <span className="font-serif font-semibold text-2xl tracking-tight">
            Quantitative Reasoning
          </span>
        </div>
        <p className="text-muted-foreground">
          A four-week college Quantitative Reasoning course — lectures, tutoring,
          practice, and graded assessments.
        </p>
        {authFailed && (
          <div className="p-3 rounded-md border border-destructive text-destructive text-sm">
            Sign-in failed. Please try again.
          </div>
        )}
        <div className="p-8 rounded-lg border border-border bg-card space-y-4">
          <p className="font-medium">Sign in with Google to access the course.</p>
          <a
            href="/api/auth/google"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-base font-medium bg-primary text-primary-foreground hover:opacity-90"
            data-testid="button-login"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          A Google account is required. No content is available without signing in.
        </p>
      </div>
    </div>
  );
}

function AuthGate() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  if (auth.status === "signedOut") {
    return <SignInScreen />;
  }

  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthGate />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
