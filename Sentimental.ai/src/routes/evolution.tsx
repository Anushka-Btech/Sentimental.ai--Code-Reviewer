import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { MemoryCard } from "@/components/memory-card";
import { evolutionCompare } from "@/lib/sentimental/api.functions";
import type { ReviewInput, ReviewResult } from "@/lib/sentimental/types";
import { Loader2, Play, Sparkles } from "lucide-react";

export const Route = createFileRoute("/evolution")({
  head: () => ({
    meta: [
      { title: "Evolution Mode — Sentimental.ai" },
      {
        name: "description",
        content:
          "Replay the same pull request with 0, 10, and 50 memories loaded. See the actual memories retrieved at each stage.",
      },
    ],
  }),
  component: EvolutionPage,
});

const DEFAULT: ReviewInput = {
  team: "payments",
  developer: "Rahul",
  title: "Add refund webhook handler",
  description:
    "Handles Stripe refund webhooks. Validates payload in the controller and updates the DB directly.",
  diff: `+def handle_refund_webhook(req):
+    payload = req.json
+    if not payload.get("id"): return 400
+    db.execute("UPDATE charges SET refunded=true WHERE id=%s", payload["id"])
+    return 200`,
};

const STAGE_META = [
  {
    key: "no-memory" as const,
    label: "Stage 1",
    title: "0 memories",
    sub: "Stateless AI reviewer",
    accent: "border-border-strong",
  },
  {
    key: "some-memory" as const,
    label: "Stage 2",
    title: "10 memories retrieved",
    sub: "Context-aware",
    accent: "border-info/40",
  },
  {
    key: "expert-memory" as const,
    label: "Stage 3",
    title: "50 memories retrieved",
    sub: "Team expert",
    accent: "border-primary/50 shadow-glow",
  },
];

function EvolutionPage() {
  const [input, setInput] = useState<ReviewInput>(DEFAULT);
  const compareFn = useServerFn(evolutionCompare);
  const compare = useMutation({
    mutationFn: () => compareFn({ data: { input } }),
  });
  const results = compare.data?.results ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Evolution Mode"
        title="Same PR. Three states of memory."
        description="One pull request, replayed through three reviewers. Each column shows the actual memories retrieved and the review they produced. The same model, with different memory, behaves like a different engineer."
        actions={
          <button
            onClick={() => compare.mutate()}
            disabled={compare.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {compare.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run all three
          </button>
        }
      />

      <div className="mb-8 grid gap-3 rounded-2xl border border-border/60 bg-surface/50 p-5 md:grid-cols-4">
        <FieldInline label="Team">
          <select
            className="input"
            value={input.team}
            onChange={(e) => setInput({ ...input, team: e.target.value as ReviewInput["team"] })}
          >
            <option value="payments">payments</option>
            <option value="analytics">analytics</option>
            <option value="infrastructure">infrastructure</option>
          </select>
        </FieldInline>
        <FieldInline label="Developer">
          <input
            className="input"
            value={input.developer}
            onChange={(e) => setInput({ ...input, developer: e.target.value })}
          />
        </FieldInline>
        <FieldInline label="Title" className="md:col-span-2">
          <input
            className="input"
            value={input.title}
            onChange={(e) => setInput({ ...input, title: e.target.value })}
          />
        </FieldInline>
        <FieldInline label="Diff" className="md:col-span-4">
          <textarea
            className="input min-h-[120px] font-mono text-xs"
            value={input.diff}
            onChange={(e) => setInput({ ...input, diff: e.target.value })}
          />
        </FieldInline>
      </div>

      {compare.isError ? (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(compare.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {STAGE_META.map((s, i) => {
          const r = results[i];
          return (
            <div
              key={s.key}
              className={`flex flex-col rounded-2xl border bg-surface/60 ${s.accent}`}
            >
              <div className="border-b border-border/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {s.label}
                  </span>
                  {r ? (
                    <span className="font-mono text-[10px] text-primary">
                      {r.memoriesConsulted} memories
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
              <div className="flex-1 space-y-3 p-5">
                {!r && compare.isPending ? (
                  <Skeleton />
                ) : !r ? (
                  <p className="text-sm text-muted-foreground">
                    Click "Run all three" to generate.
                  </p>
                ) : (
                  <StageResult result={r} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Where did those memories come from?
        </div>
        <p className="text-sm text-muted-foreground">
          Every PR ever reviewed, every accepted comment, every architectural decision is stored
          in Hindsight. At review time we search that store, rank what's relevant, and feed it
          into the prompt. The middle column shows what the agent <em>chose</em>. The right
          column shows what happens when it has the full team brain.
        </p>
      </div>

      <style>{`
        .input { width:100%; background:var(--color-input); border:1px solid var(--color-border-strong); border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; color:var(--color-foreground); outline:none; }
        .input:focus { border-color:var(--color-ring); box-shadow:0 0 0 3px color-mix(in oklab, var(--color-ring) 25%, transparent); }
      `}</style>
    </AppShell>
  );
}

function FieldInline({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-secondary" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

function StageResult({ result }: { result: ReviewResult }) {
  return (
    <div className="space-y-3">
      {result.retrieved.length > 0 ? (
        <div className="rounded-lg border border-info/30 bg-info/5 p-3">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-info">
            Retrieved memories
          </div>
          <div className="grid gap-1.5">
            {result.retrieved.slice(0, 5).map((c) => (
              <MemoryCard key={c.id} card={c} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-sm text-foreground">{result.summary}</p>
      {result.comments.map((c, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <SeverityBadge severity={c.severity} />
            <span className="text-xs font-medium">{c.title}</span>
            {c.supportingCount > 0 ? (
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                {Math.round(c.confidence * 100)}% · {c.supportingCount}×
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{c.body}</p>
          {c.evidence.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.evidence.map((e) => (
                <code
                  key={e.memoryId}
                  title={e.summary}
                  className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary"
                >
                  {e.memoryId}
                </code>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <p className="text-[10px] italic text-muted-foreground">{result.rationale}</p>
    </div>
  );
}
