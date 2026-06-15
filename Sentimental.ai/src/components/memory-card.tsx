import type { RetrievedMemoryCard } from "@/lib/sentimental/types";
import { BookOpen, Code2, History, User } from "lucide-react";

const ICONS = {
  team_standard: BookOpen,
  architecture: Code2,
  developer: User,
  review: History,
} as const;

const KIND_LABEL = {
  team_standard: "STANDARD",
  architecture: "ARCH",
  developer: "DEV",
  review: "PRECEDENT",
} as const;

export function MemoryCard({ card }: { card: RetrievedMemoryCard }) {
  const Icon = ICONS[card.kind];
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-3 transition hover:border-primary/40">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
          {KIND_LABEL[card.kind]}
        </span>
        <code className="ml-auto rounded bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {card.id}
        </code>
      </div>
      <div className="text-xs font-medium text-foreground">{card.label}</div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{card.detail}</div>
      <div className="text-green-500 font-semibold">
        Retrieved from Hindsight Memory
        </div>
    </div>
  );
}
