import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { getTimeline } from "@/lib/sentimental/api.functions";
import {
  CheckCircle2,
  GitBranch,
  Sparkles,
  ThumbsDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "@/lib/sentimental/types";

const timelineQuery = queryOptions({
  queryKey: ["timeline"],
  queryFn: () => getTimeline(),
});

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Learning Journey — Sentimental.ai" },
      {
        name: "description",
        content:
          "Watch Sentimental.ai learn in real time: accepted comments, extracted patterns, promoted standards, and confidence shifts.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(timelineQuery),
  component: TimelinePage,
});

function TimelinePage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Learning Journey"
        title="Memory timeline"
        description="Every accept, reject, pattern extraction, and standard promotion is a beat in the reviewer's learning. This is what Hindsight is doing under the hood."
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <TimelineContent />
      </Suspense>
    </AppShell>
  );
}

const ICONS: Record<TimelineEventType, React.ComponentType<{ className?: string }>> = {
  review_generated: GitBranch,
  comment_accepted: CheckCircle2,
  comment_rejected: ThumbsDown,
  pattern_extracted: Sparkles,
  standard_promoted: TrendingUp,
  confidence_updated: TrendingUp,
};

const COLOR: Record<TimelineEventType, string> = {
  review_generated: "text-info border-info/40 bg-info/10",
  comment_accepted: "text-success border-success/40 bg-success/10",
  comment_rejected: "text-destructive border-destructive/40 bg-destructive/10",
  pattern_extracted: "text-primary border-primary/40 bg-primary/10",
  standard_promoted: "text-primary border-primary/40 bg-primary/10",
  confidence_updated: "text-warning border-warning/40 bg-warning/10",
};

function TimelineContent() {
  const { data } = useSuspenseQuery(timelineQuery);
  const events = data.events;

  if (!events.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/30 p-12 text-center">
        <XCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No timeline events yet. Submit a review and accept some comments.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
      <ul className="space-y-4">
        {events.map((ev) => (
          <li key={ev.id} className="relative flex gap-4">
            <EventDot ev={ev} />
            <div className="flex-1 rounded-xl border border-border/60 bg-surface/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-wider">{ev.type.replace(/_/g, " ")}</span>
                {ev.team ? (
                  <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                    {ev.team}
                  </span>
                ) : null}
                <span className="ml-auto">{new Date(ev.at).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{ev.title}</div>
              <div className="text-xs text-muted-foreground">{ev.detail}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventDot({ ev }: { ev: TimelineEvent }) {
  const Icon = ICONS[ev.type];
  return (
    <div
      className={"relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border " + COLOR[ev.type]}
    >
      <Icon className="h-4 w-4" />
    </div>
  );
}
