import type {
  ArchitectureMemory,
  DeveloperMemory,
  ReviewMemory,
  Team,
  TeamStandardMemory,
} from "./types";

const DEVELOPERS: Record<Team, string[]> = {
  payments: ["Rahul", "Priya", "Marcus"],
  analytics: ["Lin", "Sofia", "Jonas"],
  infrastructure: ["Devon", "Ana", "Yuki"],
};

const PR_TITLES: Record<Team, string[]> = {
  payments: [
    "Add refund webhook handler",
    "Idempotency key for charge endpoint",
    "Stripe Connect onboarding flow",
    "Fix race in payout aggregator",
    "Tax calculation for EU invoices",
    "Disputes dashboard query",
    "Capture-on-confirm for split payments",
  ],
  analytics: [
    "Cohort retention pipeline",
    "Funnel event schema migration",
    "Backfill DAU rollups",
    "Snowflake materialized view",
    "Event deduplication worker",
    "Dimension table for plans",
  ],
  infrastructure: [
    "Add retry budget to gRPC client",
    "Migrate to async logger",
    "Terraform module for VPC peering",
    "Health check tightening",
    "Sidecar for cert rotation",
    "Promote canary on SLO threshold",
  ],
};

const CODE_PATTERNS: Record<Team, string[]> = {
  payments: [
    "controller-level validation",
    "raw SQL in handler",
    "missing idempotency key",
    "no audit log entry",
    "service-layer validation",
    "repository pattern with transaction",
    "untyped Stripe payload",
  ],
  analytics: [
    "untyped DataFrame column",
    "schema not validated at boundary",
    "implicit null handling",
    "missing type hints on transform",
    "in-place mutation of event batch",
  ],
  infrastructure: [
    "missing retry on transient error",
    "no metric for new code path",
    "blocking call in event loop",
    "panic without context",
    "config read at request time",
  ],
};

const STANDARDS: Record<Team, { standard: string; rationale: string }[]> = {
  payments: [
    {
      standard: "Validation belongs in the service layer, not the controller",
      rationale:
        "Controllers stayed thin; reusing validation across REST + webhook entry points avoids duplicated bugs.",
    },
    {
      standard: "Every money-moving action writes an audit log entry",
      rationale: "Compliance + dispute defense; we lost a chargeback case in 2023 due to a missing trail.",
    },
    {
      standard: "Use the repository pattern for any Stripe-backed entity",
      rationale: "Centralizes API key rotation, retries, and idempotency.",
    },
    {
      standard: "All external POSTs must include an idempotency key",
      rationale: "Prevents duplicate captures when retries occur.",
    },
  ],
  analytics: [
    {
      standard: "Type hints required on every transform function",
      rationale: "Mypy gate catches schema drift before it hits warehouse.",
    },
    {
      standard: "Validate event payloads at the ingestion boundary",
      rationale: "Bad upstream events corrupt rollups; fail fast at the edge.",
    },
    {
      standard: "Never mutate event batches in place",
      rationale: "Downstream consumers in the same process see stale data.",
    },
  ],
  infrastructure: [
    {
      standard: "Every new code path emits at least one RED metric",
      rationale: "On-call cannot debug what is not measured.",
    },
    {
      standard: "Retries must use the shared retry budget client",
      rationale: "Unbounded retries amplified the 2024 cascading failure.",
    },
    {
      standard: "Config is read at startup, not per request",
      rationale: "Per-request config reads added 8ms p99 last quarter.",
    },
  ],
};

const ARCHITECTURE: Record<Team, { pattern: string; evidence: string[] }[]> = {
  payments: [
    {
      pattern: "Repository + Service + Controller layering",
      evidence: ["src/payments/repositories/", "src/payments/services/", "ADR-014"],
    },
    {
      pattern: "Audit logging via @audited decorator",
      evidence: ["src/payments/audit.py", "ADR-021"],
    },
  ],
  analytics: [
    {
      pattern: "Strict pydantic models at ingestion boundary",
      evidence: ["src/analytics/schemas/", "ADR-008"],
    },
  ],
  infrastructure: [
    {
      pattern: "Observability triplet: metric + log + trace per handler",
      evidence: ["pkg/obs/", "RFC-031"],
    },
    {
      pattern: "Retry budget client wraps all outbound HTTP",
      evidence: ["pkg/retrybudget/", "RFC-017"],
    },
  ],
};

const DEV_HABITS: Record<string, string[]> = {
  Rahul: ["Forgets to add tests for error paths", "Skips audit log entries on new endpoints"],
  Priya: ["Excellent test coverage", "Tends to inline validation in controllers"],
  Marcus: ["Strong on idempotency", "Sometimes mixes business logic into Stripe webhooks"],
  Lin: ["Misses type hints on private helpers"],
  Sofia: ["Mutates DataFrames in place"],
  Jonas: ["Skips schema validation on internal events"],
  Devon: ["Adds metrics consistently", "Sometimes uses ad-hoc retry loops"],
  Ana: ["Reads config inside hot paths"],
  Yuki: ["Excellent observability", "Occasionally panics without context wrap"],
};

const DAY = 86_400_000;

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

export function buildSyntheticHistory(): {
  reviews: ReviewMemory[];
  standards: TeamStandardMemory[];
  developers: DeveloperMemory[];
  architecture: ArchitectureMemory[];
} {
  const teams: Team[] = ["payments", "analytics", "infrastructure"];
  const reviews: ReviewMemory[] = [];
  let n = 0;
  for (let i = 0; i < 100; i++) {
    const team = pick(teams, i);
    const devs = DEVELOPERS[team];
    const developer = pick(devs, i);
    const title = pick(PR_TITLES[team], i);
    const pattern = pick(CODE_PATTERNS[team], i);
    const std = pick(STANDARDS[team], i);
    const accepted = i % 5 !== 0; // 80% accepted
    reviews.push({
      id: `rev_${n++}`,
      kind: "review",
      team,
      developer,
      prTitle: title,
      codePattern: pattern,
      comment: `${std.standard}. Detected ${pattern} in ${title}.`,
      severity: i % 7 === 0 ? "critical" : i % 3 === 0 ? "major" : "minor",
      outcome: accepted ? "accepted" : "rejected",
      createdAt: daysAgo(120 - i),
    });
  }

  const standards: TeamStandardMemory[] = [];
  for (const team of teams) {
    for (const s of STANDARDS[team]) {
      const supporting = reviews.filter(
        (r) => r.team === team && r.outcome === "accepted" && r.comment.startsWith(s.standard),
      );
      standards.push({
        id: `std_${standards.length}`,
        kind: "team_standard",
        team,
        standard: s.standard,
        rationale: s.rationale,
        confidence: Math.min(0.98, 0.6 + supporting.length * 0.05),
        supportingReviewIds: supporting.map((r) => r.id),
        createdAt: daysAgo(90),
      });
    }
  }

  const developers: DeveloperMemory[] = [];
  for (const [dev, habits] of Object.entries(DEV_HABITS)) {
    for (const habit of habits) {
      developers.push({
        id: `dev_${developers.length}`,
        kind: "developer",
        developer: dev,
        habit,
        frequency: 2 + (developers.length % 6),
        lastSeen: daysAgo(developers.length * 2),
      });
    }
  }

  const architecture: ArchitectureMemory[] = [];
  for (const team of teams) {
    for (const a of ARCHITECTURE[team]) {
      architecture.push({
        id: `arch_${architecture.length}`,
        kind: "architecture",
        team,
        pattern: a.pattern,
        evidence: a.evidence,
      });
    }
  }

  return { reviews, standards, developers, architecture };
}
