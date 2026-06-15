import { buildSyntheticHistory } from "./synthetic-data";
import type {
  AnyMemory,
  ArchitectureMemory,
  DeveloperMemory,
  ReviewInput,
  ReviewMemory,
  RetrievedMemoryCard,
  Team,
  TeamStandardMemory,
  TimelineEvent,
} from "./types";

/**
 * Memory service ("memory_service.py" equivalent).
 *
 * Functions:
 *   - storeReview()
 *   - searchSimilarReviews()
 *   - getTeamStandards()
 *   - getDeveloperPatterns()
 *   - extractNewPattern()   (LLM-backed)
 *
 * Backend: local store seeded with 100 synthetic PRs. When HINDSIGHT_API_KEY +
 * HINDSIGHT_BASE_URL are set, search/upsert calls are mirrored to a live
 * Hindsight REST endpoint (POST /search, POST /upsert).
 */

type Store = {
  reviews: Map<string, ReviewMemory>;
  standards: Map<string, TeamStandardMemory>;
  developers: Map<string, DeveloperMemory>;
  architecture: Map<string, ArchitectureMemory>;
  timeline: TimelineEvent[];
  initialized: boolean;
};

const GLOBAL_KEY = "__sentimental_memory_store__";

function getStore(): Store {
  const g = globalThis as unknown as Record<string, Store | undefined>;
  if (!g[GLOBAL_KEY]) {
    const seed = buildSyntheticHistory();
    const store: Store = {
      reviews: new Map(seed.reviews.map((m) => [m.id, m])),
      standards: new Map(seed.standards.map((m) => [m.id, m])),
      developers: new Map(seed.developers.map((m) => [m.id, m])),
      architecture: new Map(seed.architecture.map((m) => [m.id, m])),
      timeline: [
        {
          id: "tl_seed",
          at: new Date().toISOString(),
          type: "standard_promoted",
          title: `Seeded memory store with ${seed.reviews.length} PRs and ${seed.standards.length} standards`,
          detail: "Synthetic team history loaded across payments, analytics and infrastructure.",
        },
      ],
      initialized: true,
    };
    g[GLOBAL_KEY] = store;
  }
  return g[GLOBAL_KEY] as Store;
}

function hindsightConfig() {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const baseUrl = process.env.HINDSIGHT_BASE_URL;
  if (apiKey && baseUrl) return { apiKey, baseUrl };
  return null;
}

async function hindsightSearch(query: string, k: number): Promise<AnyMemory[]> {
  const cfg = hindsightConfig();
  if (!cfg) return [];
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ query, k }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: AnyMemory[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function hindsightUpsert(memory: AnyMemory): Promise<void> {
  const cfg = hindsightConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/upsert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ memory }),
    });
  } catch {
    /* swallow */
  }
}

function logEvent(ev: Omit<TimelineEvent, "id" | "at">) {
  const s = getStore();
  s.timeline.unshift({
    id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...ev,
  });
  if (s.timeline.length > 200) s.timeline.length = 200;
}

function scoreReview(r: ReviewMemory, input: ReviewInput): number {
  let s = 0;
  if (r.team === input.team) s += 3;
  if (r.developer === input.developer) s += 2;
  const text = `${input.title} ${input.description} ${input.diff}`.toLowerCase();
  if (text.includes(r.codePattern.toLowerCase())) s += 4;
  if (text.includes(r.prTitle.toLowerCase().split(" ")[0])) s += 1;
  if (r.outcome === "accepted") s += 1;
  return s;
}

export interface MemoryContext {
  reviews: ReviewMemory[];
  standards: TeamStandardMemory[];
  developer: DeveloperMemory[];
  architecture: ArchitectureMemory[];
  source: "hindsight" | "local";
}


export async function searchSimilarReviews(
  input: ReviewInput,
  k = 5,
): Promise<{ items: ReviewMemory[]; source: "hindsight" | "local" }> {
  const store = getStore();
  const remote = await hindsightSearch(
    `${input.team} ${input.title} ${input.description}`,
    20,
  );
  const remoteReviews = remote.filter((m): m is ReviewMemory => m.kind === "review");
  if (remoteReviews.length) {
    return { items: remoteReviews.slice(0, k), source: "hindsight" };
  }
  const local = [...store.reviews.values()]
    .map((r) => ({ r, s: scoreReview(r, input) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.r);
  return { items: local, source: "local" };
}

export function getTeamStandards(team: Team, k = 4): TeamStandardMemory[] {
  return [...getStore().standards.values()]
    .filter((s) => s.team === team)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, k);
}

export function getDeveloperPatterns(developer: string, k = 3): DeveloperMemory[] {
  return [...getStore().developers.values()]
    .filter((d) => d.developer === developer)
    .slice(0, k);
}

export function getArchitectureFor(team: Team, k = 3): ArchitectureMemory[] {
  return [...getStore().architecture.values()]
    .filter((a) => a.team === team)
    .slice(0, k);
}

export async function retrieveContext(
  input: ReviewInput,
  limit: { reviews: number; standards: number; developer: number; architecture: number } = {
    reviews: 5,
    standards: 4,
    developer: 3,
    architecture: 3,
  },
): Promise<MemoryContext> {
  const { items: reviews, source } = await searchSimilarReviews(input, limit.reviews);
  return {
    reviews,
    standards: getTeamStandards(input.team, limit.standards),
    developer: getDeveloperPatterns(input.developer, limit.developer),
    architecture: getArchitectureFor(input.team, limit.architecture),
    source,
  };
}

export function toRetrievalCards(ctx: MemoryContext, max = 8): RetrievedMemoryCard[] {
  const cards: RetrievedMemoryCard[] = [];
  ctx.standards.forEach((s, i) =>
    cards.push({
      id: s.id,
      kind: "team_standard",
      label: s.standard,
      detail: `${Math.round(s.confidence * 100)}% confidence · ${s.supportingReviewIds.length} supporting reviews`,
      team: s.team,
      score: 100 - i,
    }),
  );
  ctx.architecture.forEach((a, i) =>
    cards.push({
      id: a.id,
      kind: "architecture",
      label: a.pattern,
      detail: a.evidence.join(", "),
      team: a.team,
      score: 80 - i,
    }),
  );
  ctx.developer.forEach((d, i) =>
    cards.push({
      id: d.id,
      kind: "developer",
      label: `${d.developer}: ${d.habit}`,
      detail: `Seen ${d.frequency}× · last ${new Date(d.lastSeen).toLocaleDateString()}`,
      developer: d.developer,
      score: 70 - i,
    }),
  );
  ctx.reviews.forEach((r, i) =>
    cards.push({
      id: r.id,
      kind: "review",
      label: `PR "${r.prTitle}"`,
      detail: `${r.outcome.toUpperCase()} · ${r.team}/${r.developer} · ${r.comment}`,
      team: r.team,
      developer: r.developer,
      score: 60 - i,
    }),
  );
  return cards.sort((a, b) => b.score - a.score).slice(0, max);
}

export async function storeReview(memory: ReviewMemory): Promise<void> {
  getStore().reviews.set(memory.id, memory);
  await hindsightUpsert(memory);
  logEvent({
    type: memory.outcome === "accepted" ? "comment_accepted" : "comment_rejected",
    title: `${memory.outcome === "accepted" ? "Accepted" : "Rejected"}: ${memory.codePattern}`,
    detail: memory.comment,
    team: memory.team,
    refId: memory.id,
  });
}


export function reinforceStandard(args: {
  team: Team;
  commentTitle: string;
  outcome: "accepted" | "rejected";
  reviewId: string;
}): TeamStandardMemory | null {
  const s = getStore();
  const candidates = [...s.standards.values()].filter((x) => x.team === args.team);
  const match = candidates.find(
    (x) =>
      x.standard.toLowerCase().includes(args.commentTitle.toLowerCase()) ||
      args.commentTitle.toLowerCase().includes(x.standard.toLowerCase().split(" ")[0]),
  );
  if (!match) return null;
  const delta = args.outcome === "accepted" ? 0.02 : -0.04;
  const next: TeamStandardMemory = {
    ...match,
    confidence: Math.max(0, Math.min(0.99, match.confidence + delta)),
    supportingReviewIds:
      args.outcome === "accepted"
        ? [...new Set([...match.supportingReviewIds, args.reviewId])]
        : match.supportingReviewIds,
  };
  s.standards.set(next.id, next);
  logEvent({
    type: "confidence_updated",
    title: `${args.outcome === "accepted" ? "↑" : "↓"} ${Math.round(next.confidence * 100)}% — ${next.standard}`,
    detail: `Standard reinforced by ${args.outcome} review.`,
    team: next.team,
    refId: next.id,
  });
  void hindsightUpsert(next);
  return next;
}

export async function extractNewPattern(team: Team): Promise<TeamStandardMemory | null> {
  const s = getStore();
  const accepted = [...s.reviews.values()].filter(
    (r) => r.team === team && r.outcome === "accepted",
  );
  const groups = new Map<string, ReviewMemory[]>();
  for (const r of accepted) {
    const key = r.codePattern.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const existing = new Set(
    [...s.standards.values()]
      .filter((x) => x.team === team)
      .map((x) => x.standard.toLowerCase()),
  );

  // Find biggest group not already represented by a standard
  let bestKey: string | null = null;
  let best: ReviewMemory[] = [];
  for (const [key, items] of groups) {
    const alreadyStandard = [...existing].some((std) => std.includes(key.split(" ")[0]));
    if (alreadyStandard) continue;
    if (items.length >= 3 && items.length > best.length) {
      best = items;
      bestKey = key;
    }
  }
  if (!bestKey) return null;

  // Use LLM to synthesise a clean standard from the supporting comments.
  let standardText = `Address "${bestKey}" recurrent in ${team} reviews`;
  let rationaleText = best.slice(0, 3).map((b) => `- ${b.comment}`).join("\n");
  try {
    const { chat } = await import("./llm.server");
    const { text } = await chat(
      [
        {
          role: "system",
          content:
            "You synthesise a single, opinionated engineering team standard from accepted PR review comments. Reply in strict JSON: { \"standard\": string, \"rationale\": string }. Keep standard < 90 chars, rationale < 200 chars.",
        },
        {
          role: "user",
          content: `Team: ${team}\nRepeated pattern: ${bestKey}\nAccepted review excerpts:\n${best
            .slice(0, 5)
            .map((b) => `- ${b.comment}`)
            .join("\n")}`,
        },
      ],
      { jsonMode: true, temperature: 0.2 },
    );
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as { standard?: string; rationale?: string };
    if (parsed.standard) standardText = parsed.standard;
    if (parsed.rationale) rationaleText = parsed.rationale;
  } catch {
    /* fall back to defaults */
  }

  const std: TeamStandardMemory = {
    id: `std_ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: "team_standard",
    team,
    standard: standardText,
    rationale: rationaleText,
    confidence: Math.min(0.95, 0.6 + best.length * 0.05),
    supportingReviewIds: best.map((b) => b.id),
    createdAt: new Date().toISOString(),
  };
  s.standards.set(std.id, std);
  await hindsightUpsert(std);
  logEvent({
    type: "pattern_extracted",
    title: `New standard extracted: ${std.standard}`,
    detail: `Inferred from ${best.length} accepted reviews on pattern "${bestKey}".`,
    team,
    refId: std.id,
  });
  logEvent({
    type: "standard_promoted",
    title: `Promoted to team standard (${Math.round(std.confidence * 100)}%)`,
    detail: std.rationale,
    team,
    refId: std.id,
  });
  return std;
}

// ============================================================
// Read-only helpers used by UI
// ============================================================

export function listAll(): {
  reviews: ReviewMemory[];
  standards: TeamStandardMemory[];
  developers: DeveloperMemory[];
  architecture: ArchitectureMemory[];
} {
  const s = getStore();
  return {
    reviews: [...s.reviews.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    standards: [...s.standards.values()].sort((a, b) => b.confidence - a.confidence),
    developers: [...s.developers.values()],
    architecture: [...s.architecture.values()],
  };
}

export function listByTeam(team: Team) {
  const all = listAll();
  return {
    reviews: all.reviews.filter((r) => r.team === team),
    standards: all.standards.filter((s) => s.team === team),
    architecture: all.architecture.filter((a) => a.team === team),
  };
}

export function listTimeline(limit = 40): TimelineEvent[] {
  return getStore().timeline.slice(0, limit);
}

export function backendInfo() {
  const cfg = hindsightConfig();
  return {
    hindsightConnected: Boolean(cfg),
    seededMemories:
      getStore().reviews.size +
      getStore().standards.size +
      getStore().developers.size +
      getStore().architecture.size,
  };
}
