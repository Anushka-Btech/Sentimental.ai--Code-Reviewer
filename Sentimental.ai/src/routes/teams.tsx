import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { compareAcrossTeams } from "@/lib/sentimental/api.functions";
import type { ReviewResult, Team } from "@/lib/sentimental/types";
import { Loader2, Play, Users } from "lucide-react";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "Team Switch Demo — Sentimental.ai" },
      {
        name: "description",
        content:
          "Same pull request, three teams. Watch how Sentimental.ai's review changes based on each team's organizational memory.",
      },
    ],
  }),
  component: TeamsPage,
});

const DEFAULT = {
  title: "Add new endpoint to mutate user state",
  description:
    "POST /users/:id/state with body { new_state }. No retries, no validation outside the controller.",
  diff: `+def update_user_state(req, user_id):
+    body = req.json
+    if not body.get("new_state"): return 400
+    db.execute("UPDATE users SET state=%s WHERE id=%s", body["new_state"], user_id)
+    return 200`,
};

const TEAM_META: Record<Team, { color: string; subtitle: string }> = {
  payments: { color: "border-primary/40", subtitle: "Cares about audit logs + idempotency" },
  analytics: { color: "border-info/40", subtitle: "Cares about type hints + schema validation" },
  infrastructure: { color: "border-warning/40", subtitle: "Cares about retries + observability" },
};

function TeamsPage() {
  const [form, setForm] = useState(DEFAULT);
  const fn = useServerFn(compareAcrossTeams);
  const run = useMutation({ mutationFn: () => fn({ data: { input: form } }) });

  const results = run.data?.results ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team Switch Demo"
        title="One PR. Three team brains."
        description="The same diff is reviewed by three teams. Each pulls from its own memory: payments insists on audit logs, analytics demands type hints, infrastructure flags missing retries. Memory changes behaviour."
        actions={
          <button
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {run.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Review across all teams
          </button>
        }
      />

      <div className="mb-8 grid gap-3 rounded-2xl border border-border/60 bg-surface/50 p-5">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            PR title
          </span>
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Diff
          </span>
          <textarea
            className="input min-h-[140px] font-mono text-xs"
            value={form.diff}
            onChange={(e) => setForm({ ...form, diff: e.target.value })}
          />
        </label>
      </div>

      {run.isError ? (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(run.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {(["payments", "analytics", "infrastructure"] as Team[]).map((team, i) => {
          const r = results[i] as { team: Team; result: ReviewResult } | undefined;
          return (
            <div
              key={team}
              className={`flex flex-col rounded-2xl border bg-surface/60 ${TEAM_META[team].color}`}
            >
              <div className="border-b border-border/60 p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                    {team}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold">{team} team review</h3>
                <p className="text-xs text-muted-foreground">{TEAM_META[team].subtitle}</p>
              </div>
              <div className="flex-1 space-y-3 p-5">
                {!r && run.isPending ? (
                  <Skeleton />
                ) : !r ? (
                  <p className="text-sm text-muted-foreground">
                    Click "Review across all teams" to generate.
                  </p>
                ) : (
                  <StageResult result={r.result} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .input { width:100%; background:var(--color-input); border:1px solid var(--color-border-strong); border-radius:0.5rem; padding:0.5rem 0.75rem; font-size:0.875rem; color:var(--color-foreground); outline:none; }
        .input:focus { border-color:var(--color-ring); box-shadow:0 0 0 3px color-mix(in oklab, var(--color-ring) 25%, transparent); }
      `}</style>
    </AppShell>
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
      <p className="text-sm text-foreground">{result.summary}</p>
      {result.comments.slice(0, 4).map((c, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <SeverityBadge severity={c.severity} />
            <span className="text-xs font-medium">{c.title}</span>
            {c.supportingCount > 0 ? (
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                {Math.round(c.confidence * 100)}%
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{c.body}</p>
        </div>
      ))}
      <p className="text-[10px] italic text-muted-foreground">{result.rationale}</p>
    </div>
  );
}
