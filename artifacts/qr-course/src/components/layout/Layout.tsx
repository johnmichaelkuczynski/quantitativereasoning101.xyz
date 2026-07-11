import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, PenTool, BarChart3, Activity, RotateCcw, Sparkles, ClipboardCheck, LogOut, UserCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../hooks/use-auth";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/assignments", label: "Assignments", icon: PenTool },
    { href: "/assessments", label: "Assessments", icon: ClipboardCheck },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
              QR
            </div>
            <span className="font-serif font-semibold text-lg tracking-tight">Quantitative Reasoning</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
        Quantitative Reasoning MVP
      </div>
    </div>
  );
}

function AuthControls() {
  const { isLoading, isAuthenticated, user, login, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (isLoading) {
    return (
      <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground" data-testid="auth-loading">
        <UserCircle className="w-5 h-5 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mr-auto">
        <button
          onClick={login}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
          data-testid="button-google-login"
          title="Sign in with your Google account"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" opacity=".9"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/>
            <path fill="#fff" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" opacity=".5"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" opacity=".8"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="mr-auto flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm" data-testid="text-user-info">
        <UserCircle className="w-5 h-5 text-muted-foreground" />
        <span className="font-medium">{user.displayName || user.username}</span>
        {user.email && <span className="text-muted-foreground hidden md:inline">({user.email})</span>}
      </div>
      <button
        onClick={async () => {
          setSigningOut(true);
          try {
            await logout();
          } finally {
            setSigningOut(false);
          }
        }}
        disabled={signingOut}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary disabled:opacity-50"
        data-testid="button-logout"
        title="Sign out of your Google account"
      >
        <LogOut className="w-4 h-4" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

function TopBar() {
  const [location, setLocation] = useLocation();
  const active = location.startsWith("/diagnostics");
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [expanding, setExpanding] = useState(false);

  async function handleExpandLectures() {
    if (
      !confirm(
        "Generate Medium and Long versions of every lecture? This runs the tutor over all 28 lectures twice (medium, then long). Takes a few minutes.",
      )
    )
      return;
    setExpanding(true);
    try {
      const mRes = await fetch("/api/diagnostics/expand-lectures?level=medium", { method: "POST" });
      if (!mRes.ok) throw new Error(`Medium expansion failed: HTTP ${mRes.status}`);
      const mData = (await mRes.json()) as { updated?: number; failed?: number; total?: number };
      const lRes = await fetch("/api/diagnostics/expand-lectures?level=long", { method: "POST" });
      if (!lRes.ok) throw new Error(`Long expansion failed: HTTP ${lRes.status}`);
      const lData = (await lRes.json()) as { updated?: number; failed?: number; total?: number };
      await qc.invalidateQueries();
      alert(
        `Medium: ${mData.updated ?? 0}/${mData.total ?? 0} (${mData.failed ?? 0} failed)\n` +
          `Long:   ${lData.updated ?? 0}/${lData.total ?? 0} (${lData.failed ?? 0} failed)`,
      );
    } catch (e) {
      alert(`Lecture rewrite failed: ${(e as Error).message}`);
    } finally {
      setExpanding(false);
    }
  }

  async function handleReset() {
    if (
      !confirm(
        "Reset the course? This deletes every assignment attempt, answer, and practice session, but keeps lectures and assignments.",
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch("/api/diagnostics/reset", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await qc.invalidateQueries();
      setLocation("/");
    } catch (e) {
      alert(`Reset failed: ${(e as Error).message}`);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-end gap-2 px-6 py-3 border-b border-border bg-background/80 backdrop-blur">
      <AuthControls />
      <button
        onClick={handleExpandLectures}
        disabled={expanding}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary disabled:opacity-50"
        data-testid="button-expand-lectures"
        title="Rewrite every lecture with worked examples after each point"
      >
        <Sparkles className={`w-4 h-4 ${expanding ? "animate-pulse" : ""}`} />
        {expanding ? "Rewriting…" : "Generate medium + long lectures"}
      </button>
      <button
        onClick={handleReset}
        disabled={resetting}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary disabled:opacity-50"
        data-testid="button-reset"
        title="Wipe all student progress (keeps lectures and assignments)"
      >
        <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
        {resetting ? "Resetting…" : "Reset course"}
      </button>
      <Link href="/diagnostics">
        <button
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:bg-secondary"
          }`}
          data-testid="button-diagnostic"
        >
          <Activity className="w-4 h-4" />
          Diagnostic
        </button>
      </Link>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
