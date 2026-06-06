import { Severity } from "@/types/report";

const STYLES: Record<Severity, { label: string; cls: string }> = {
  [Severity.DMAT_TRIGGERING]: {
    label: "DMAT TRIGGERING",
    cls: "text-accent-red border-accent-red/50 bg-accent-red/10",
  },
  [Severity.HIGH]: {
    label: "HIGH",
    cls: "text-accent-amber border-accent-amber/50 bg-accent-amber/10",
  },
  [Severity.MEDIUM]: {
    label: "MEDIUM",
    cls: "text-accent-blue border-accent-blue/50 bg-accent-blue/10",
  },
  [Severity.LOW]: {
    label: "LOW",
    cls: "text-text-secondary border-border bg-bg-highlight",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
