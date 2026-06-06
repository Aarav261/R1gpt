"use client";

import type { AuditItem } from "@/lib/dashboard/mock";
import type { AuditReport } from "@/types/report";
import type { AuditProgress } from "@/lib/dashboard/auditClient";
import { Tag, ViewHead } from "../ui";

interface Props {
  items: AuditItem[];
  live: AuditReport | null;
  running: boolean;
  progress: AuditProgress | null;
  error: string | null;
  onRun: () => void;
}

const ICON: Record<AuditItem["s"], { ch: string; bg: string; fg: string }> = {
  pass: { ch: "✓", bg: "#defbe6", fg: "#24a148" },
  warn: { ch: "!", bg: "#fcf4d6", fg: "#8e6a00" },
  fail: { ch: "×", bg: "#fff1f1", fg: "#da1e28" },
};

export function Audit({ items, live, running, progress, error, onRun }: Props) {
  const blocking = items.filter((i) => i.s === "fail").length;
  const warn = items.filter((i) => i.s === "warn").length;
  const pass = items.filter((i) => i.s === "pass").length;
  const blocked = blocking > 0;

  return (
    <section>
      <ViewHead
        title="Pre-Submission Audit"
        sub="Automated check against AEMO R1 checklist & NER S5.2.5 — before AEMO ever sees it"
        right={
          <button
            className={`cds-btn ${blocked ? "cds-btn--secondary" : "cds-btn--primary"}`}
            onClick={() =>
              blocked
                ? alert("Submission blocked — resolve blocking items first.")
                : alert("Generating submission package…")
            }
          >
            Generate Submission Package
          </button>
        }
      />

      {/* Live pipeline control — wired to /api/demo + /api/audit. */}
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-hairline bg-surface-1 px-4 py-3">
        <button className="cds-btn cds-btn--tertiary cds-btn--sm" onClick={onRun} disabled={running}>
          {running ? "Running…" : "Run live audit (Ironbark demo)"}
        </button>
        <span className="text-xs text-ink-muted">
          {running && progress
            ? `${progress.stage} — ${progress.detail}`
            : live
              ? `Live report · ${live.project_name} · readiness ${Math.round(live.readiness_index)}/100 · materiality ${live.materiality_class}`
              : "Runs the real extraction → assessment → scoring pipeline on bundled fixtures (needs OPENAI_API_KEY)."}
        </span>
      </div>

      {error && (
        <div className="mb-4 border-l-2 border-error bg-[#fff1f1] px-4 py-3 text-sm text-ink">
          {error}
        </div>
      )}

      <div
        className={`mb-4 flex items-center gap-3 border-l-2 px-4 py-3.5 text-sm font-semibold ${
          blocked ? "border-error bg-[#fff1f1]" : "border-success bg-[#defbe6]"
        }`}
      >
        <span className="text-lg">{blocked ? "⛔" : "✓"}</span>
        <div className="font-normal text-ink">
          {blocked ? (
            <>
              <b>Submission blocked</b> — {blocking} blocking item{blocking === 1 ? "" : "s"} must be cleared.{" "}
              {warn} warning, {pass} passed.
              <br />
              <span className="text-xs text-ink-muted">
                This is exactly what would have triggered a TDD round if lodged as-is.
              </span>
            </>
          ) : (
            <>
              <b>Audit clear</b> — {pass} passed, {warn} warning{warn === 1 ? "" : "s"}, no blocking items.
            </>
          )}
        </div>
      </div>

      <div>
        {items.map((a, i) => {
          const ic = ICON[a.s];
          return (
            <div
              key={i}
              className="mb-2 grid grid-cols-[24px_1fr_auto] items-center gap-3 border border-hairline bg-canvas px-3 py-3"
            >
              <span
                className="grid h-6 w-6 place-items-center text-xs font-semibold"
                style={{ background: ic.bg, color: ic.fg }}
              >
                {ic.ch}
              </span>
              <div>
                <div className="text-sm font-semibold tracking-carbon text-ink">{a.name}</div>
                <div className="text-xs text-ink-muted">{a.d}</div>
              </div>
              {a.s === "pass" ? (
                <Tag tone="green">Pass</Tag>
              ) : a.s === "warn" ? (
                <Tag tone="amber">Warning</Tag>
              ) : (
                <Tag tone="red">Blocking</Tag>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
