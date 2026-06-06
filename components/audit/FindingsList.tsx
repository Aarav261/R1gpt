"use client";

import { useMemo, useState } from "react";
import { Finding, Severity } from "@/types/report";
import { FindingCard } from "./FindingCard";

type Tab = "all" | Severity;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: Severity.DMAT_TRIGGERING, label: "DMAT triggering" },
  { key: Severity.HIGH, label: "High" },
  { key: Severity.MEDIUM, label: "Medium" },
  { key: Severity.LOW, label: "Low" },
];

export function FindingsList({ findings }: { findings: Finding[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: findings.length };
    for (const f of findings) c[f.severity] = (c[f.severity] ?? 0) + 1;
    return c;
  }, [findings]);

  const visible =
    tab === "all" ? findings : findings.filter((f) => f.severity === tab);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-none border px-3 py-1.5 font-sans text-xs transition-colors ${
              tab === t.key
                ? "border-ibm-blue bg-surface-2 text-ink"
                : "border-hairline bg-surface-1 text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span className="rounded-none bg-canvas px-1.5 py-0.5 text-[10px] text-ink-subtle">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-none border border-hairline bg-surface-1 p-6 text-center font-sans text-sm text-ink-subtle">
          No findings in this category.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((f) => (
            <FindingCard key={`${f.finding_id}-${f.clause ?? ""}`} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}
