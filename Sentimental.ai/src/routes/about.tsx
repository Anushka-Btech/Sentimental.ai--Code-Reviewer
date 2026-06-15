import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Brain, Database, GitMerge, Workflow } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Sentimental.ai" },
      {
        name: "description",
        content:
          "How Sentimental.ai uses Hindsight + Groq to give AI code reviewers persistent organizational memory.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="About"
        title="Memory is the product."
        description="Sentimental.ai is not a chatbot. It is an organizational engineering memory system. Hindsight stores the team brain; Groq writes the review."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={<Database className="h-5 w-5" />} title="Four memory collections">
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>· <span className="text-foreground">Review memory</span> — PRs, comments, accepted/rejected outcomes</li>
            <li>· <span className="text-foreground">Team standards</span> — inferred from repeated accepted feedback, with confidence</li>
            <li>· <span className="text-foreground">Developer profiles</span> — recurring habits per engineer</li>
            <li>· <span className="text-foreground">Architecture</span> — repo-specific patterns and ADRs</li>
          </ul>
        </Card>
        <Card icon={<Workflow className="h-5 w-5" />} title="Agent workflow">
          <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>1. Engineer submits PR</li>
            <li>2. <span className="text-foreground">Hindsight search</span> retrieves relevant memories</li>
            <li>3. Prompt assembly: standards + arch + developer + precedents</li>
            <li>4. <span className="text-foreground">Groq</span> generates a grounded review</li>
            <li>5. Engineer accepts or rejects each comment</li>
            <li>6. Outcome is written back; pattern-extraction agent updates standards</li>
          </ol>
        </Card>
        <Card icon={<GitMerge className="h-5 w-5" />} title="Pattern extraction">
          <p className="mt-2 text-sm text-muted-foreground">
            When ≥ 3 accepted reviews share a code pattern but no team standard yet exists, the
            <span className="text-foreground"> pattern extraction agent </span> uses Groq to
            synthesise a new standard from the accepted comments and stores it back in
            Hindsight with a confidence score.
          </p>
        </Card>
        <Card icon={<Brain className="h-5 w-5" />} title="Why this beats stateless review">
          <p className="mt-2 text-sm text-muted-foreground">
            The same LLM, given the right context, behaves like a different engineer. The bottleneck
            is not model quality — it is memory. Hindsight is the substrate that turns a generic
            reviewer into a senior teammate.
          </p>
        </Card>
      </div>

      <h2 className="mt-12 mb-4 font-display text-2xl font-semibold">How Hindsight works here</h2>
      <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-surface/60 p-6 font-mono text-xs leading-6 text-muted-foreground">
{`        PR submitted
              │
              ▼
   ┌──────────────────────┐
   │  Hindsight search    │  ← team_standards · architecture
   │  (top-k retrieval)   │     developer_habits · review_precedents
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Prompt assembly     │  evidence-by-id, confidence-aware
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │  Groq (gpt-oss-120b) │  ← strict-JSON review with citations
   └──────────┬───────────┘
              │
              ▼
        Reviewer UI
              │  accept / reject
              ▼
   ┌──────────────────────┐
   │  Hindsight upsert    │  outcome stored, standards reinforced
   └──────────┬───────────┘
              │   when ≥ 3 accepts share a pattern
              ▼
   ┌──────────────────────┐
   │  Pattern extraction  │  Groq → new team standard
   │  agent               │  promoted to Hindsight
   └──────────────────────┘
`}
      </pre>

      <h2 className="mt-12 mb-4 font-display text-2xl font-semibold">Demo script (≈ 2 minutes)</h2>
      <ol className="space-y-3 text-sm">
        <DemoStep secs={15} label="Problem">
          Copilot forgets. Claude forgets. ChatGPT forgets. Every PR starts from zero.
        </DemoStep>
        <DemoStep secs={20} label="Review without memory">
          Open <em>Evolution</em>. Stage 1 review is generic — "add validation", "consider error
          handling".
        </DemoStep>
        <DemoStep secs={20} label="Show retrieved memories">
          Stage 2 column lists actual memory cards: team standard <code>std_0</code>, arch note
          <code>arch_1</code>, developer habit <code>dev_2</code>.
        </DemoStep>
        <DemoStep secs={20} label="Review with memory">
          Stage 3 review cites <code>std_0</code>, <code>std_1</code> with confidence and supporting
          count. Reads like a senior engineer who has shipped with the team for years.
        </DemoStep>
        <DemoStep secs={20} label="Switch teams">
          Open <em>Team Switch</em>. Same diff → payments flags missing audit log, analytics flags
          missing type hints, infrastructure flags missing retry budget. Memory changes behaviour.
        </DemoStep>
        <DemoStep secs={15} label="Learning dashboard + timeline">
          Open <em>Dashboard</em> for confidence-ranked standards. Open <em>Timeline</em> to see
          accepted comments, pattern extractions, standards promoted live.
        </DemoStep>
        <DemoStep secs={10} label="Close">
          Sentimental.ai transforms code review from stateless AI into organizational engineering memory.
        </DemoStep>
      </ol>

      <div className="mt-12 rounded-2xl border border-border/60 bg-surface/60 p-6">
        <h2 className="mb-3 font-display text-xl font-semibold">Plug in your keys</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          The app works out of the box on Lovable AI with a local Hindsight-compatible store
          seeded with 100 synthetic PRs. To run on real infrastructure, add these secrets in
          Project Settings:
        </p>
        <div className="space-y-2 font-mono text-xs">
          <div className="rounded-md border border-border/60 bg-background/60 p-3">
            <span className="text-primary">GROQ_API_KEY</span>
            <span className="text-muted-foreground"> — swaps the LLM to Groq (default model: openai/gpt-oss-120b)</span>
          </div>
          <div className="rounded-md border border-border/60 bg-background/60 p-3">
            <span className="text-primary">HINDSIGHT_API_KEY</span>
            <span className="text-muted-foreground"> + </span>
            <span className="text-primary">HINDSIGHT_BASE_URL</span>
            <span className="text-muted-foreground"> — routes search + upsert to a live Hindsight endpoint (POST /search, POST /upsert)</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DemoStep({
  secs,
  label,
  children,
}: {
  secs: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-xl border border-border/60 bg-surface/60 p-4">
      <div className="w-20 shrink-0 font-mono text-xs">
        <div className="text-primary">{secs}s</div>
        <div className="text-muted-foreground">{label}</div>
      </div>
      <div className="flex-1 text-sm text-muted-foreground">{children}</div>
    </li>
  );
}
