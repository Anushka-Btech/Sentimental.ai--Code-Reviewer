import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { MemoryCard } from "@/components/memory-card";
import {
  previewMemoryRetrieval,
  recordReviewOutcome,
  reviewPullRequest,
} from "@/lib/sentimental/api.functions";
import type {
  ReviewInput,
  ReviewResult,
  RetrievedMemoryCard,
} from "@/lib/sentimental/types";
import {
  Brain,
  CheckCircle2,
  Database,
  Loader2,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review Studio — Sentimental.ai" },
      {
        name: "description",
        content:
          "Submit a pull request, watch Hindsight retrieve relevant memories, then get a senior-engineer review with evidence and confidence.",
      },
    ],
  }),
  component: ReviewStudio,
});

const SAMPLE: ReviewInput = {
  team: "payments",
  developer: "Rahul",
  title: "Add refund webhook handler",
  description:
    "Handles Stripe refund.created webhooks and updates our charges table. Validates the event in the controller and writes directly to the DB.",
  diff: `--- a/src/payments/controllers/refund_webhook.py
+++ b/src/payments/controllers/refund_webhook.py
@@
+def handle_refund_webhook(req):
+    payload = req.json
+    # validate
+    if not payload.get("id") or not payload.get("amount"):
+        return 400, "bad payload"
+    # write directly
+    db.execute("UPDATE charges SET refunded=true WHERE id=%s", payload["id"])
+    return 200, "ok"
`,
};

type Phase = "idle" | "retrieving" | "reviewing" | "done";

function ReviewStudio() {
  const [form, setForm] = useState<ReviewInput>(SAMPLE);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [retrieved, setRetrieved] = useState<RetrievedMemoryCard[] | null>(null);
  const [source, setSource] = useState<"hindsight" | "local" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [recorded, setRecorded] = useState<
    Map<number, { outcome: "accepted" | "rejected"; newStd: boolean }>
  >(new Map());

  const previewFn = useServerFn(previewMemoryRetrieval);
  const reviewFn = useServerFn(reviewPullRequest);
  const recordFn = useServerFn(recordReviewOutcome);

  const run = async () => {
    setResult(null);
    setRetrieved(null);
    setSource(null);
    setRecorded(new Map());
    setPhase("retrieving");
    try {
      const preview = await previewFn({ data: { input: form } });
      setRetrieved(preview.cards);
      setSource(preview.source);
      setPhase("reviewing");
      const r = await reviewFn({
        data: { input: form, stage: "expert-memory" },
      });
      setResult(r);
      setPhase("done");
    } catch (e) {
      setPhase("idle");
      alert((e as Error).message);
    }
  };

  const record = useMutation({
    mutationFn: (args: { idx: number; outcome: "accepted" | "rejected" }) =>
      recordFn({
        data: {
          input: form,
          comment: result!.comments[args.idx],
          outcome: args.outcome,
        },
      }).then((res) => ({ args, res })),
    onSuccess: ({ args, res }) => {
      setRecorded((prev) => {
        const m = new Map(prev);
        m.set(args.idx, { outcome: args.outcome, newStd: res.newStandard });
        return m;
      });
    },
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Review Studio"
        title="Submit a pull request"
        description="The reviewer first retrieves relevant memories from Hindsight, then drafts feedback grounded in your team's history. Every comment cites evidence and a confidence score."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-surface/50 p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Team">
                <select
                  className="input"
                  value={form.team}
                  onChange={(e) => setForm({ ...form, team: e.target.value as ReviewInput["team"] })}
                >
                  <option value="payments">payments</option>
                  <option value="analytics">analytics</option>
                  <option value="infrastructure">infrastructure</option>
                </select>
              </Field>
              <Field label="Developer">
                <input
                  className="input"
                  value={form.developer}
                  onChange={(e) => setForm({ ...form, developer: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Pull request title">
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                className="input min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label="Diff">
              <textarea
                className="input min-h-[240px] font-mono text-xs"
                value={form.diff}
                onChange={(e) => setForm({ ...form, diff: e.target.value })}
              />
            </Field>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setForm(SAMPLE)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset to sample
              </button>
              <button
                type="submit"
                disabled={phase === "retrieving" || phase === "reviewing"}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {phase === "retrieving" || phase === "reviewing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate review
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {phase === "idle" && !result ? <EmptyState /> : null}

          {(phase === "retrieving" || retrieved) && (
            <RetrievalPanel
              cards={retrieved}
              loading={phase === "retrieving"}
              source={source}
            />
          )}

          {phase === "reviewing" ? (
            <div className="rounded-2xl border border-border/60 bg-surface/50 p-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
              Assembling prompt from {retrieved?.length ?? 0} memories and calling the LLM…
            </div>
          ) : null}

          {result ? (
            <ResultPanel
              result={result}
              recorded={recorded}
              onRecord={(idx, outcome) => record.mutate({ idx, outcome })}
            />
          ) : null}
        </div>
      </div>

      <style>{`
        .input { width:100%; background:var(--color-input); border:1px solid var(--color-border-strong); border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; color:var(--color-foreground); outline:none; }
        .input:focus { border-color:var(--color-ring); box-shadow:0 0 0 3px color-mix(in oklab, var(--color-ring) 25%, transparent); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-surface/30 p-10 text-center">
      <Brain className="mx-auto mb-3 h-10 w-10 text-primary/60" />
      <p className="text-sm text-muted-foreground">
        Submit a pull request to watch memory retrieval, then the review.
      </p>
    </div>
  );
}

function RetrievalPanel({
  cards,
  loading,
  source,
}: {
  cards: RetrievedMemoryCard[] | null;
  loading: boolean;
  source: "hindsight" | "local" | null;
}) {
  return (
    <div className="rounded-2xl border border-info/30 bg-info/5 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-info">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {loading
            ? "Retrieving memories from Hindsight…"
            : `Retrieved ${cards?.length ?? 0} relevant memories`}
        </div>
        {source ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <Database className="h-3 w-3" />
            {source === "hindsight" ? "Hindsight (live)" : "Hindsight-compatible local store"}
          </span>
        ) : null}
      </div>
      {loading || !cards ? (
        <div className="grid gap-2 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-border/60 bg-background/40"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No relevant memories found for this PR.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {cards.map((c) => (
            <MemoryCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  result,
  recorded,
  onRecord,
}: {
  result: ReviewResult;
  recorded: Map<number, { outcome: "accepted" | "rejected"; newStd: boolean }>;
  onRecord: (idx: number, outcome: "accepted" | "rejected") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Review generated using {result.memoriesConsulted} relevant memories
        </div>
        <p className="text-sm text-foreground">{result.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">{result.rationale}</p>
      </div>

      {result.comments.map((c, i) => {
        const rec = recorded.get(i);
        return (
          <div key={i} className="rounded-2xl border border-border/60 bg-surface/60 p-5">
            <div className="mb-2 flex items-center gap-3">
              <SeverityBadge severity={c.severity} />
              <h3 className="font-display text-base font-semibold">{c.title}</h3>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {Math.round(c.confidence * 100)}% confidence
                {c.supportingCount > 0 ? ` · ${c.supportingCount} accepted` : ""}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{c.body}</p>

            {c.evidence.length ? (
              <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Evidence
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {c.evidence.map((e) => (
                    <li key={e.memoryId} className="flex gap-2">
                      <code className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-foreground">
                        {e.memoryId}
                      </code>
                      <span>{e.summary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              {rec ? (
                <span
                  className={
                    "inline-flex items-center gap-1.5 text-xs " +
                    (rec.outcome === "accepted" ? "text-success" : "text-destructive")
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {rec.outcome === "accepted" ? "Accepted →" : "Rejected →"} written to memory
                  {rec.newStd ? " · pattern extracted into a new team standard" : ""}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => onRecord(i, "accepted")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs text-success transition hover:bg-success/20"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => onRecord(i, "rejected")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive transition hover:bg-destructive/20"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> Reject
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {result.comments.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface/50 p-6 text-center text-sm text-muted-foreground">
          <XCircle className="mx-auto mb-2 h-6 w-6" />
          No issues found.
        </div>
      ) : null}
    </div>
  );
}
