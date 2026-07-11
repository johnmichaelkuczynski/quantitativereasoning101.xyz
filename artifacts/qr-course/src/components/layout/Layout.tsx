import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, PenTool, BarChart3, Activity, RotateCcw, Sparkles, ClipboardCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded || !user) return null;

  const name =
    user.fullName ||
    user.primaryEmailAddress?.emailAddress ||
    user.username ||
    "Student";
  const email = user.primaryEmailAddress?.emailAddress;
  const initial = (name || "S").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>
        )}
        <div className="hidden md:flex flex-col leading-tight min-w-0">
          <span className="text-sm font-medium truncate max-w-[140px]">{name}</span>
          {email && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {email}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => signOut({ redirectUrl: basePath || "/" })}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary"
        data-testid="button-logout"
        title="Log out"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  );
}

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
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-6 py-3 border-b border-border bg-background/80 backdrop-blur">
      <UserMenu />
      <div className="flex items-center gap-2">
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
