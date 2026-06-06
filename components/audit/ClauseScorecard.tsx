import { ClauseStatus } from "@/types/report";
import { PsmgBadge } from "@/components/ui/PsmgBadge";

interface ClauseMeta {
  clause: string;
  label: string;
  psmg: string;
}

// Canonical clause display order with PSMG section references.
const CLAUSES: ClauseMeta[] = [
  { clause: "S5.2.5.2", label: "Quality of supply", psmg: "Section 4.1" },
  { clause: "S5.2.5.9", label: "Protection systems", psmg: "Section 5.2.2" },
  { clause: "S5.2.5.11", label: "Frequency control", psmg: "Section 4.3.2" },
  {
    clause: "S5.2.5.13",
    label: "Voltage and reactive power",
    psmg: "Section 4.3",
  },
  { clause: "S5.2.5.14", label: "Active power control", psmg: "Section 4.3" },
  { clause: "S5.2.5.15", label: "Short circuit ratio", psmg: "Section 4.2" },
  { clause: "S5.2.8", label: "Fault ride-through", psmg: "Section 6.3" },
];

const STATUS_STYLE: Record<
  ClauseStatus,
  { label: string; cls: string; dot: string }
> = {
  pass: {
    label: "PASS",
    cls: "border-success/40 bg-success/5",
    dot: "bg-success text-success",
  },
  fail: {
    label: "FAIL",
    cls: "border-error/40 bg-error/5",
    dot: "bg-error text-error",
  },
  partial: {
    label: "PARTIAL",
    cls: "border-warning/40 bg-warning/5",
    dot: "bg-warning text-warning",
  },
  missing: {
    label: "MISSING",
    cls: "border-hairline bg-surface-1",
    dot: "bg-ink-subtle text-ink-subtle",
  },
};

export function ClauseScorecard({
  scorecard,
}: {
  scorecard: Record<string, ClauseStatus>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CLAUSES.map((c) => {
        const status: ClauseStatus = scorecard[c.clause] ?? "missing";
        const s = STATUS_STYLE[status];
        return (
          <div
            key={c.clause}
            className={`flex flex-col rounded-none border p-3 ${s.cls}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-ink">
                {c.clause}
              </span>
              <span
                className={`font-sans text-[11px] font-semibold tracking-wider ${s.dot.split(" ")[1]}`}
              >
                {s.label}
              </span>
            </div>
            <span className="mt-1 font-sans text-xs text-ink-muted">
              {c.label}
            </span>
            <div className="mt-2">
              <PsmgBadge refText={c.psmg} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
