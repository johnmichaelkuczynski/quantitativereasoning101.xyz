import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
