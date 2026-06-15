export type Team = "payments" | "analytics" | "infrastructure";
export type Severity = "info" | "minor" | "major" | "critical";
export type MemoryKind = "review" | "team_standard" | "developer" | "architecture";

export interface ReviewMemory {
  id: string;
  kind: "review";
  team: Team;
  developer: string;
  prTitle: string;
  codePattern: string;
  comment: string;
  severity: Severity;
  outcome: "accepted" | "rejected" | "pending";
  createdAt: string;
}

export interface TeamStandardMemory {
  id: string;
  kind: "team_standard";
  team: Team;
  standard: string;
  rationale: string;
  confidence: number; // 0..1
  supportingReviewIds: string[];
  createdAt: string;
}

export interface DeveloperMemory {
  id: string;
  kind: "developer";
  developer: string;
  habit: string;
  frequency: number;
  lastSeen: string;
}

export interface ArchitectureMemory {
  id: string;
  kind: "architecture";
  team: Team;
  pattern: string;
  evidence: string[];
}

export type AnyMemory =
  | ReviewMemory
  | TeamStandardMemory
  | DeveloperMemory
  | ArchitectureMemory;

export interface EvidenceLink {
  memoryId: string;
  summary: string;
  kind: MemoryKind;
}

export interface ReviewComment {
  severity: Severity;
  title: string;
  body: string;
  evidence: EvidenceLink[];
  /** 0..1 confidence the suggestion is grounded in team standards */
  confidence: number;
  /** how many accepted past reviews back this suggestion */
  supportingCount: number;
}

export interface RetrievedMemoryCard {
  id: string;
  kind: MemoryKind;
  label: string;        // human-friendly heading (e.g. PR title or standard text)
  detail: string;       // short detail
  team?: Team;
  developer?: string;
  score: number;        // relevance score
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  stage: "no-memory" | "some-memory" | "expert-memory";
  memoriesConsulted: number;
  retrieved: RetrievedMemoryCard[];
  rationale: string;
}

export interface ReviewInput {
  team: Team;
  developer: string;
  title: string;
  description: string;
  diff: string;
}

export type TimelineEventType =
  | "review_generated"
  | "comment_accepted"
  | "comment_rejected"
  | "pattern_extracted"
  | "standard_promoted"
  | "confidence_updated";

export interface TimelineEvent {
  id: string;
  at: string;
  type: TimelineEventType;
  title: string;
  detail: string;
  team?: Team;
  refId?: string; // related memory id
}
