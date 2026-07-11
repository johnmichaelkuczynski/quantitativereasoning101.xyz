import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { LogIn, Copy, Check, RefreshCw } from "lucide-react";

export type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
};

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: AuthUser; isAdmin: boolean };

const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/user", { credentials: "include" });
        const data: {
          authenticated: boolean;
          user?: AuthUser | null;
        } = res.ok ? await res.json() : { authenticated: false };
        if (cancelled) return;
        if (data.authenticated && data.user) {
          let isAdmin = false;
          try {
            const chk = await fetch("/api/admin/check", { credentials: "include" });
            isAdmin = chk.ok;
          } catch {
            isAdmin = false;
          }
          if (!cancelled) setAuth({ status: "signedIn", user: data.user, isAdmin });
        } else {
          setAuth({ status: "signedOut" });
        }
      } catch {
        if (!cancelled) setAuth({ status: "signedOut" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function isFramed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function devCallbackUrl(): string {
  if (typeof window === "undefined") return "";
  return `https://${window.location.host}/auth/google/callback`;
}

export function launchGoogleLogin(): "newTab" | "sameTab" {
  const url = `${window.location.origin}/api/auth/google`;
  if (isFramed()) {
    // Note: passing "noopener" in the features string makes window.open
    // return null even on success, so we null out `opener` manually instead.
    const opened = window.open(url, "_blank");
    if (opened) {
      try {
        opened.opener = null;
      } catch {
        // Cross-origin restrictions may block this; the tab is still open.
      }
      return "newTab";
    }
  }
  window.location.href = url;
  return "sameTab";
}

export function useGoogleLogin() {
  const [waiting, setWaiting] = useState(false);

  const login = useCallback(() => {
    const mode = launchGoogleLogin();
    if (mode === "newTab") setWaiting(true);
  }, []);

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;

    const check = async () => {
      try {
        const res = await fetch("/api/auth/user", { credentials: "include" });
        const data: { authenticated?: boolean } = res.ok
          ? await res.json()
          : { authenticated: false };
        if (!stopped && data.authenticated) {
          window.location.reload();
        }
      } catch {
        // Ignore transient errors; the next poll will retry.
      }
    };

    const interval = window.setInterval(check, 2000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [waiting]);

  return { login, waiting };
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
