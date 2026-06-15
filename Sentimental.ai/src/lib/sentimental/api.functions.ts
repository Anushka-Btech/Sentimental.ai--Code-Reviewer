import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TeamSchema = z.enum(["payments", "analytics", "infrastructure"]);
const SeveritySchema = z.enum(["info", "minor", "major", "critical"]);
const StageSchema = z.enum(["no-memory", "some-memory", "expert-memory"]);
const MemoryKindSchema = z.enum(["review", "team_standard", "developer", "architecture"]);

const ReviewInputSchema = z.object({
  team: TeamSchema,
  developer: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  diff: z.string().min(1).max(20000),
});

const CommentSchema = z.object({
  severity: SeveritySchema,
  title: z.string(),
  body: z.string(),
  evidence: z
    .array(
      z.object({
        memoryId: z.string(),
        summary: z.string(),
        kind: MemoryKindSchema,
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1).default(0.5),
  supportingCount: z.number().int().min(0).default(0),
});

export const reviewPullRequest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: ReviewInputSchema,
      stage: StageSchema.default("expert-memory"),
    }),
  )
  .handler(async ({ data }) => {
    const { generateReview } = await import("./review-engine.server");
    return generateReview(data.input, data.stage);
  });

export const previewMemoryRetrieval = createServerFn({ method: "POST" })
  .inputValidator(z.object({ input: ReviewInputSchema }))
  .handler(async ({ data }) => {
    const { previewRetrieval } = await import("./review-engine.server");
    return previewRetrieval(data.input);
  });

export const evolutionCompare = createServerFn({ method: "POST" })
  .inputValidator(z.object({ input: ReviewInputSchema }))
  .handler(async ({ data }) => {
    const { generateReview } = await import("./review-engine.server");
    const stages: ("no-memory" | "some-memory" | "expert-memory")[] = [
      "no-memory",
      "some-memory",
      "expert-memory",
    ];
    const results = await Promise.all(stages.map((s) => generateReview(data.input, s)));
    return { results };
  });

export const compareAcrossTeams = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: ReviewInputSchema.omit({ team: true, developer: true }).extend({
        developer: z.string().default("Guest"),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { generateReview } = await import("./review-engine.server");
    const teams: ("payments" | "analytics" | "infrastructure")[] = [
      "payments",
      "analytics",
      "infrastructure",
    ];
    const developers = { payments: "Rahul", analytics: "Lin", infrastructure: "Devon" } as const;
    const results = await Promise.all(
      teams.map((team) =>
        generateReview(
          {
            team,
            developer: developers[team],
            title: data.input.title,
            description: data.input.description,
            diff: data.input.diff,
          },
          "expert-memory",
        ).then((r) => ({ team, result: r })),
      ),
    );
    return { results };
  });

export const recordReviewOutcome = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      input: ReviewInputSchema,
      comment: CommentSchema,
      outcome: z.enum(["accepted", "rejected"]),
    }),
  )
  .handler(async ({ data }) => {
    const { recordOutcome } = await import("./review-engine.server");
    return recordOutcome(data);
  });

export const triggerPatternExtraction = createServerFn({ method: "POST" })
  .inputValidator(z.object({ team: TeamSchema }))
  .handler(async ({ data }) => {
    const { extractNewPattern } = await import("./memory-store.server");
    return { standard: await extractNewPattern(data.team) };
  });

export const listMemories = createServerFn({ method: "GET" }).handler(async () => {
  const { listAll, backendInfo } = await import("./memory-store.server");
  const { llmInfo } = await import("./llm.server");
  return { ...listAll(), backend: backendInfo(), llm: llmInfo() };
});

export const getTimeline = createServerFn({ method: "GET" }).handler(async () => {
  const { listTimeline, backendInfo } = await import("./memory-store.server");
  return { events: listTimeline(60), backend: backendInfo() };
});

export const teamSnapshot = createServerFn({ method: "POST" })
  .inputValidator(z.object({ team: TeamSchema }))
  .handler(async ({ data }) => {
    const { listByTeam } = await import("./memory-store.server");
    return listByTeam(data.team);
  });
