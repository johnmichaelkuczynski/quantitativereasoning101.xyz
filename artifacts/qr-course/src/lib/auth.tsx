import React, { createContext, useContext, useEffect, useState } from "react";

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
