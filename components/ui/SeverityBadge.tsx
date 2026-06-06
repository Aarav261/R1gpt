import { Severity } from "@/types/report";

const STYLES: Record<Severity, { label: string; cls: string }> = {
  [Severity.DMAT_TRIGGERING]: {
    label: "DMAT TRIGGERING",
    cls: "bg-[#fff1f1] text-[#a2191f]",
  },
  [Severity.HIGH]: {
    label: "HIGH",
    cls: "bg-[#fcf4d6] text-[#684e00]",
  },
  [Severity.MEDIUM]: {
    label: "MEDIUM",
    cls: "bg-[#d0e2ff] text-[#002d9c]",
  },
  [Severity.LOW]: {
    label: "LOW",
    cls: "bg-surface-2 text-ink-muted",
  },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const s = STYLES[severity];
  return (
    <span
      className={`inline-flex items-center rounded-none px-2 py-0.5 font-sans text-[11px] font-semibold tracking-wider ${s.cls}`}
    >
      {s.label}
    </span>
  );
}
