import { chat } from "./llm.server";
import {
  extractNewPattern,
  getTeamStandards,
  type MemoryContext,
  reinforceStandard,
  retrieveContext,
  storeReview,
  toRetrievalCards,
} from "./memory-store.server";
import type {
  EvidenceLink,
  ReviewComment,
  ReviewInput,
  ReviewMemory,
  ReviewResult,
  Severity,
} from "./types";

function buildContextPrompt(ctx: MemoryContext, stageLimit: number): string {
  const reviews = ctx.reviews.slice(0, stageLimit);
  const standards = ctx.standards.slice(0, Math.max(0, Math.floor(stageLimit / 2)));
  const dev = ctx.developer.slice(0, Math.max(0, Math.floor(stageLimit / 2)));
  const arch = ctx.architecture.slice(0, Math.max(0, Math.floor(stageLimit / 2)));

  const parts: string[] = [];
  if (standards.length) {
    parts.push("# Team standards (most confident first)");
    for (const s of standards) {
      parts.push(
        `- [${s.id}] (${Math.round(s.confidence * 100)}% confidence, ${s.supportingReviewIds.length} accepted reviews) ${s.standard}. Rationale: ${s.rationale}`,
      );
    }
  }
  if (arch.length) {
    parts.push("\n# Architecture conventions");
    for (const a of arch) {
      parts.push(`- [${a.id}] ${a.pattern}. Evidence: ${a.evidence.join(", ")}`);
    }
  }
  if (dev.length) {
    parts.push("\n# Developer history");
    for (const d of dev) {
      parts.push(`- [${d.id}] ${d.developer}: ${d.habit} (seen ${d.frequency}x)`);
    }
  }
  if (reviews.length) {
    parts.push("\n# Past review precedents");
    for (const r of reviews) {
      parts.push(
        `- [${r.id}] (${r.outcome}) ${r.team}/${r.developer} on "${r.prTitle}": ${r.comment}`,
      );
    }
  }
  return parts.join("\n");
}

const SYSTEM_NO_MEMORY = `You are a generic AI code reviewer. You have no team context, no past PRs, and no awareness of conventions. Give shallow, generic best-practice feedback. Do not invent team-specific knowledge. Reply in JSON.`;

const SYSTEM_WITH_MEMORY = `
You are Sentimental.ai.

You are an AI code reviewer powered by Hindsight Memory.

Your goal is not to provide generic feedback.

You must:

- Learn from past reviews
- Follow team standards
- Use architecture memories
- Use developer habits
- Cite memory evidence

For every recommendation include:

1. Recommendation
2. Why it matters
3. Supporting memories
4. Confidence

Behave like a senior engineer who has worked on the team for years.

Always prioritize retrieved memories over generic coding advice.
`;

const OUTPUT_SCHEMA_HINT = `Return JSON with this exact shape:
{
  "summary": "1-2 sentence overall verdict",
  "comments": [
    {
      "severity": "info" | "minor" | "major" | "critical",
      "title": "short headline",
      "body": "1-3 sentence explanation",
      "evidenceIds": ["id_referenced_from_context", ...]
    }
  ]
}
At most 5 comments. For the generic (no-memory) reviewer, evidenceIds must be [].`;

export type Stage = "no-memory" | "some-memory" | "expert-memory";

const STAGE_LIMITS: Record<Stage, number> = {
  "no-memory": 0,
  "some-memory": 5,
  "expert-memory": 20,
};

interface ParsedReview {
  summary: string;
  comments: {
    severity: Severity;
    title: string;
    body: string;
    evidenceIds: string[];
  }[];
}

function safeParse(text: string): ParsedReview {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  try {
    const obj = JSON.parse(cleaned) as ParsedReview;
    if (!obj.comments) obj.comments = [];
    return obj;
  } catch {
    return {
      summary: "Could not parse model output.",
      comments: [
        {
          severity: "info",
          title: "Raw model output",
          body: text.slice(0, 600),
          evidenceIds: [],
        },
      ],
    };
  }
}

export async function generateReview(
  input: ReviewInput,
  stage: Stage = "expert-memory",
): Promise<ReviewResult> {
  const ctx = await retrieveContext(input);
  const limit = STAGE_LIMITS[stage];

  const contextBlock = stage === "no-memory" ? "" : buildContextPrompt(ctx, limit);
  const memoriesConsulted =
    stage === "no-memory"
      ? 0
      : Math.min(limit, ctx.reviews.length) +
        Math.min(Math.floor(limit / 2), ctx.standards.length) +
        Math.min(Math.floor(limit / 2), ctx.developer.length) +
        Math.min(Math.floor(limit / 2), ctx.architecture.length);

  const userPrompt = [
    `Team: ${input.team}`,
    `Developer: ${input.developer}`,
    `PR Title: ${input.title}`,
    `Description: ${input.description}`,
    "",
    "Diff:",
    "```",
    input.diff,
    "```",
    "",
    contextBlock ? "Organizational memory context:\n" + contextBlock : "",
    "",
    OUTPUT_SCHEMA_HINT,
  ].join("\n");

  const { text } = await chat(
    [
      { role: "system", content: stage === "no-memory" ? SYSTEM_NO_MEMORY : SYSTEM_WITH_MEMORY },
      { role: "user", content: userPrompt },
    ],
    { jsonMode: true, temperature: stage === "no-memory" ? 0.5 : 0.2 },
  );

  const parsed = safeParse(text);

  const allCtx = [
    ...ctx.reviews,
    ...ctx.standards,
    ...ctx.developer,
    ...ctx.architecture,
  ];
  const byId = new Map(allCtx.map((m) => [m.id, m]));

  const comments: ReviewComment[] = parsed.comments.slice(0, 5).map((c) => {
    const evidence: EvidenceLink[] =
      stage === "no-memory"
        ? []
        : (c.evidenceIds ?? [])
            .map((id) => {
              const m = byId.get(id);
              if (!m) return null;
              const summary =
                m.kind === "review"
                  ? `${m.outcome} on "${m.prTitle}": ${m.comment}`
                  : m.kind === "team_standard"
                  ? `Standard (${Math.round(m.confidence * 100)}%): ${m.standard}`
                  : m.kind === "developer"
                  ? `${m.developer} habit: ${m.habit}`
                  : `Arch: ${m.pattern}`;
              return { memoryId: id, summary, kind: m.kind };
            })
            .filter((x): x is EvidenceLink => x !== null);

    // Derive confidence + supporting count from any team_standard evidence.
    const standardEv = evidence.find((e) => e.kind === "team_standard");
    let confidence = 0.5;
    let supportingCount = 0;
    if (standardEv) {
      const std = ctx.standards.find((s) => s.id === standardEv.memoryId);
      if (std) {
        confidence = std.confidence;
        supportingCount = std.supportingReviewIds.length;
      }
    } else if (stage !== "no-memory") {
      const reviewRefs = evidence.filter((e) => e.kind === "review").length;
      confidence = Math.min(0.85, 0.4 + reviewRefs * 0.1);
      supportingCount = reviewRefs;
    }

    return {
      severity: c.severity,
      title: c.title,
      body: c.body,
      evidence,
      confidence,
      supportingCount,
    };
  });

  const retrieved = stage === "no-memory" ? [] : toRetrievalCards(ctx, 8);

  const rationale =
    stage === "no-memory"
      ? "No organizational memory was consulted. This is what a stateless AI reviewer would say."
      : ctx.source === "hindsight"
      ? `Drew from ${memoriesConsulted} memories retrieved from Hindsight (${ctx.standards.length} standards, ${ctx.architecture.length} arch notes, ${ctx.developer.length} developer habits, ${ctx.reviews.length} precedents).`
      : `Drew from ${memoriesConsulted} memories in the local Hindsight-compatible store (${ctx.standards.length} standards, ${ctx.architecture.length} arch notes, ${ctx.developer.length} developer habits, ${ctx.reviews.length} precedents). Add HINDSIGHT_API_KEY to use a live Hindsight store.`;

  return {
    summary: parsed.summary,
    comments,
    stage,
    memoriesConsulted,
    retrieved,
    rationale,
  };
}

export async function recordOutcome(args: {
  input: ReviewInput;
  comment: ReviewComment;
  outcome: "accepted" | "rejected";
}): Promise<{ memory: ReviewMemory; standardUpdated: boolean; newStandard: boolean }> {
  const memory: ReviewMemory = {
    id: `rev_live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "review",
    team: args.input.team,
    developer: args.input.developer,
    prTitle: args.input.title,
    codePattern: args.comment.title,
    comment: args.comment.body,
    severity: args.comment.severity,
    outcome: args.outcome,
    createdAt: new Date().toISOString(),
  };
  await storeReview(memory);
  const updated = reinforceStandard({
    team: memory.team,
    commentTitle: memory.codePattern,
    outcome: args.outcome,
    reviewId: memory.id,
  });
  // Attempt pattern extraction occasionally (cheap when no group qualifies).
  let newStd = false;
  if (args.outcome === "accepted") {
    const before = getTeamStandards(memory.team, 50).length;
    await extractNewPattern(memory.team).catch(() => null);
    const after = getTeamStandards(memory.team, 50).length;
    newStd = after > before;
  }
  return { memory, standardUpdated: Boolean(updated), newStandard: newStd };
}

export async function previewRetrieval(input: ReviewInput) {
  const ctx = await retrieveContext(input);
  return {
    cards: toRetrievalCards(ctx, 12),
    source: ctx.source,
    counts: {
      standards: ctx.standards.length,
      architecture: ctx.architecture.length,
      developer: ctx.developer.length,
      reviews: ctx.reviews.length,
    },
  };
}
