import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { listMemories } from "@/lib/sentimental/api.functions";
import { TrendingUp, Users, Layers, BarChart3 } from "lucide-react";

const memoriesQuery = queryOptions({
  queryKey: ["memories"],
  queryFn: () => listMemories(),
});

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Learning Dashboard — Sentimental.ai" },
      {
        name: "description",
        content:
          "Top learned team standards, confidence scores, and the memory growth driving smarter reviews.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoriesQuery),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Learning Dashboard"
        title="What the reviewer has learned"
        description="Standards are inferred from repeated accepted feedback. Confidence grows as more reviews reinforce the pattern."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}

function DashboardContent() {
  const { data } = useSuspenseQuery(memoriesQuery);

  const totalMemories = data.reviews.length + data.standards.length + data.developers.length + data.architecture.length;
  const accepted = data.reviews.filter((r) => r.outcome === "accepted").length;
  const acceptanceRate = data.reviews.length
    ? Math.round((accepted / data.reviews.length) * 100)
    : 0;

  const teamCounts = data.standards.reduce<Record<string, number>>((acc, s) => {
    acc[s.team] = (acc[s.team] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Stat label="Total memories" value={totalMemories} icon={<Layers className="h-4 w-4" />} />
        <Stat label="Team standards" value={data.standards.length} icon={<TrendingUp className="h-4 w-4" />} />
        <Stat label="Developer profiles" value={new Set(data.developers.map((d) => d.developer)).size} icon={<Users className="h-4 w-4" />} />
        <Stat label="Acceptance rate" value={`${acceptanceRate}%`} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Top learned standards</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={data.backend.hindsightConnected ? "text-success" : "text-warning"}>
            ●
          </span>
          Memory backend:{" "}
          <code className="font-mono text-foreground">
            {data.backend.hindsightConnected ? "Hindsight (connected)" : "local fallback"}
          </code>
          <span className="mx-2">·</span>
          LLM: <code className="font-mono text-foreground">{data.llm.provider}/{data.llm.model || "—"}</code>
        </div>
      </div>

      <div className="space-y-3">
        {data.standards.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border/60 bg-surface/60 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {s.team}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    accepted {s.supportingReviewIds.length}x
                  </span>
                </div>
                <h3 className="font-display text-base font-semibold">{s.standard}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.rationale}</p>
              </div>
              <div className="w-32 shrink-0">
                <div className="flex items-baseline justify-end gap-1 font-mono">
                  <span className="text-2xl text-foreground">{Math.round(s.confidence * 100)}</span>
                  <span className="text-xs text-muted-foreground">% conf</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-brand"
                    style={{ width: `${s.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">Standards by team</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(teamCounts).map(([team, count]) => (
          <div key={team} className="rounded-xl border border-border/60 bg-surface/60 p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {team}
            </div>
            <div className="mt-2 font-display text-3xl">{count}</div>
            <div className="text-xs text-muted-foreground">learned standards</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Stat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="font-display text-3xl font-semibold">{value}</div>
    </div>
  );
}
