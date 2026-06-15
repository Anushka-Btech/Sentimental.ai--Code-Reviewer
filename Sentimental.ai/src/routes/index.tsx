import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  ArrowRight,
  Brain,
  GitPullRequest,
  History,
  Layers,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentimental.ai — AI code reviews with memory" },
      {
        name: "description",
        content:
          "An AI code reviewer that learns your team's standards, architecture, and developer habits over time. Powered by Hindsight.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell>
      <section className="relative isolate overflow-hidden rounded-3xl border border-border/60 bg-surface/50 px-8 py-20 md:px-16 md:py-28">
        <div className="absolute inset-0 -z-10 grid-bg opacity-50" />
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Hindsight memory
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
            AI code reviews{" "}
            <span className="text-gradient-brand">with memory</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Every codebase has standards. Every team has habits. Sentimental.ai
            remembers both — so reviews compound from generic feedback to senior‑engineer judgment.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
            >
              Open Review Studio <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/evolution"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-5 py-3 text-sm font-medium transition hover:bg-surface-elevated"
            >
              See the evolution demo
            </Link>
          </div>
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            Review #1: generic · Review #10: contextual · Review #50: team‑expert
          </p>
        </div>
      </section>

      <section className="mt-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Stateless reviewers forget your team.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We give the reviewer organizational memory. Every accepted comment, every
            architectural decision, every developer habit becomes context for the next review.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<History className="h-5 w-5" />}
            title="Review memory"
            text="Every past review is searchable context. Accepted patterns are reinforced; rejected ones are avoided."
          />
          <FeatureCard
            icon={<Layers className="h-5 w-5" />}
            title="Standards learning"
            text="When the same advice is accepted three times, it becomes a team standard with a confidence score."
          />
          <FeatureCard
            icon={<Brain className="h-5 w-5" />}
            title="Developer awareness"
            text="Rahul tends to skip audit logs. The reviewer knows to check, before he does."
          />
          <FeatureCard
            icon={<GitPullRequest className="h-5 w-5" />}
            title="Architecture memory"
            text="Each team's conventions — repository pattern, retry budget, ingestion schemas — are remembered per repo."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Explainable evidence"
            text="Every recommendation cites the memories it draws from. No hand‑wavy advice."
          />
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Compounds over time"
            text="The reviewer's quality is a function of memory. More PRs, sharper feedback."
          />
        </div>
      </section>

      <section className="mt-24 rounded-3xl border border-border/60 bg-surface/50 p-10 md:p-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              The wow moment
            </div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
              Same PR. Three states of memory.
            </h2>
            <p className="mt-4 text-muted-foreground">
              In Evolution Mode, we replay the same pull request with 0, 10, and 50 memories
              loaded. Watch the reviewer transform from generic AI to a senior teammate who
              has shipped with you for years.
            </p>
            <Link
              to="/evolution"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
            >
              Launch Evolution Mode <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            <StageRow label="Stage 1" memories={0} note="Generic best practices." />
            <StageRow label="Stage 2" memories={10} note="Cites team standards." />
            <StageRow label="Stage 3" memories={50} note="Knows the developer, the codebase, the ADRs." />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-surface/60 p-6 transition hover:border-primary/40 hover:bg-surface-elevated">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StageRow({ label, memories, note }: { label: string; memories: number; note: string }) {
  const pct = memories === 0 ? 8 : memories === 10 ? 35 : 95;
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="font-mono text-primary">{memories} memories</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-brand transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-foreground">{note}</p>
    </div>
  );
}
