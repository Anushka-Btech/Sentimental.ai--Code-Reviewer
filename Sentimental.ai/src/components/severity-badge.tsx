import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/sentimental/types";

const styles: Record<Severity, string> = {
  info: "bg-info/10 text-info border-info/30",
  minor: "bg-muted text-muted-foreground border-border-strong",
  major: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/40",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        styles[severity],
      )}
    >
      {severity}
    </span>
  );
}
