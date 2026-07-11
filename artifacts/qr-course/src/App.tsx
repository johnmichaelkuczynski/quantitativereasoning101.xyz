import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { devCallbackUrl, useGoogleLogin } from "@/lib/loginLauncher";
import { LogIn, Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
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

function CallbackUrlHint() {
  const [copied, setCopied] = useState(false);
  const url = devCallbackUrl();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; the URL is still selectable below.
    }
  }

  return (
    <div className="p-3 rounded-md border border-border bg-secondary/50 text-left space-y-2">
      <p className="text-xs text-muted-foreground">
        If Google rejects the sign-in, make sure this exact URL is listed under
        Authorized redirect URIs in your Google Cloud Console OAuth client:
      </p>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 text-xs break-all bg-background border border-border rounded px-2 py-1.5 select-all"
          data-testid="text-callback-url"
        >
          {url}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-secondary"
          data-testid="button-copy-callback"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function SignInScreen() {
  const authFailed =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "auth_failed";
  const { login, waiting } = useGoogleLogin();

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
          <button
            onClick={login}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-base font-medium bg-primary text-primary-foreground hover:opacity-90"
            data-testid="button-login"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          {waiting && (
            <div className="space-y-3" data-testid="status-waiting-signin">
              <p className="text-sm text-muted-foreground">
                Waiting for you to finish signing in with Google in the other
                tab… This screen will update automatically.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary"
                data-testid="button-refresh-signin"
              >
                <RefreshCw className="w-4 h-4" />
                I&apos;ve signed in — refresh
              </button>
            </div>
          )}
        </div>
        {(authFailed || waiting) && <CallbackUrlHint />}
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
