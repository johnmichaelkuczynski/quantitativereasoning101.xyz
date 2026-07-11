import { useCallback, useEffect, useState } from "react";

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
    const opened = window.open(url, "_blank", "noopener");
    if (opened) return "newTab";
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
