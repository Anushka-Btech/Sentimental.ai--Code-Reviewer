import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { listMemories } from "@/lib/sentimental/api.functions";

const memoriesQuery = queryOptions({
  queryKey: ["memories"],
  queryFn: () => listMemories(),
});

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory Explorer — Sentimental.ai" },
      {
        name: "description",
        content:
          "Inspect the review memories, team standards, developer habits, and architecture conventions stored in Hindsight.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(memoriesQuery),
  component: MemoryPage,
});

type Tab = "reviews" | "standards" | "developers" | "architecture";

function MemoryPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Memory Explorer"
        title="Inspect every memory"
        description="This is what powers the reviewer. Browse the live store. Each entry is searchable by the agent at review time."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <MemoryContent />
      </Suspense>
    </AppShell>
  );
}

function MemoryContent() {
  const { data } = useSuspenseQuery(memoriesQuery);
  const [tab, setTab] = useState<Tab>("reviews");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "reviews", label: "Review precedents", count: data.reviews.length },
    { key: "standards", label: "Team standards", count: data.standards.length },
    { key: "developers", label: "Developer habits", count: data.developers.length },
    { key: "architecture", label: "Architecture", count: data.architecture.length },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "rounded-md px-3 py-1.5 text-sm transition " +
              (tab === t.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface hover:text-foreground")
            }
          >
            {t.label}{" "}
            <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "reviews" ? (
        <div className="space-y-2">
          {data.reviews.slice(0, 50).map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{r.id}</code>
                <SeverityBadge severity={r.severity} />
                <span
                  className={
                    "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase " +
                    (r.outcome === "accepted"
                      ? "border-success/40 bg-success/10 text-success"
                      : r.outcome === "rejected"
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border-strong text-muted-foreground")
                  }
                >
                  {r.outcome}
                </span>
                <span className="text-muted-foreground">
                  {r.team} · {r.developer}
                </span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="text-sm font-medium">{r.prTitle}</div>
              <div className="text-sm text-muted-foreground">{r.comment}</div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                pattern: {r.codePattern}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "standards" ? (
        <div className="space-y-2">
          {data.standards.map((s) => (
            <div key={s.id} className="rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{s.id}</code>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                  {s.team}
                </span>
                <span className="font-mono">{Math.round(s.confidence * 100)}% confidence</span>
                <span>· {s.supportingReviewIds.length} supporting reviews</span>
              </div>
              <div className="text-sm font-medium">{s.standard}</div>
              <div className="text-sm text-muted-foreground">{s.rationale}</div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "developers" ? (
        <div className="space-y-2">
          {data.developers.map((d) => (
            <div key={d.id} className="rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{d.id}</code>
                <span className="font-medium text-foreground">{d.developer}</span>
                <span>· seen {d.frequency}x</span>
              </div>
              <div className="mt-1 text-sm">{d.habit}</div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "architecture" ? (
        <div className="space-y-2">
          {data.architecture.map((a) => (
            <div key={a.id} className="rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{a.id}</code>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase text-primary">
                  {a.team}
                </span>
              </div>
              <div className="text-sm font-medium">{a.pattern}</div>
              <div className="mt-1 flex flex-wrap gap-1 font-mono text-[10px] text-muted-foreground">
                {a.evidence.map((e) => (
                  <span key={e} className="rounded bg-secondary px-1.5 py-0.5">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
