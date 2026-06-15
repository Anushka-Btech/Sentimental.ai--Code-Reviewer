import { Link, useRouterState } from "@tanstack/react-router";
import { Brain, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/review", label: "Review Studio" },
  { to: "/evolution", label: "Evolution" },
  { to: "/teams", label: "Team Switch" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/memory", label: "Memory" },
  { to: "/timeline", label: "Timeline" },
  { to: "/about", label: "About" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-glow" />
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
              <Brain className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight">
                Sentimental<span className="text-primary">.ai</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Memory-powered code review
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "rounded-md px-2.5 py-1.5 text-sm transition-colors " +
                    (active
                      ? "bg-surface-elevated text-foreground"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            to="/review"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Try a review
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>Sentimental.ai · Built for the Vectorize Hindsight Hackathon</span>
          <span className="font-mono">
            Every codebase has standards. Every team has habits. We remember both.
          </span>
        </div>
      </footer>
    </div>
  );
}
