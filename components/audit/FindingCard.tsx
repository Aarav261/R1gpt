import { Finding } from "@/types/report";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { PsmgBadge } from "@/components/ui/PsmgBadge";
import { SourceCitation } from "@/components/ui/SourceCitation";

const EFFORT_STYLE: Record<Finding["rectification_effort"], string> = {
  hours: "text-success border-success/40",
  days: "text-ibm-blue border-ibm-blue/40",
  weeks: "text-warning border-warning/40",
  months: "text-error border-error/40",
};

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="rounded-none border border-hairline bg-surface-1 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-ink-muted">
          {finding.finding_id}
        </span>
        <SeverityBadge severity={finding.severity} />
        {finding.clause && (
          <span className="rounded-none border border-hairline bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink-muted">
            {finding.clause}
          </span>
        )}
        {finding.psmg_ref && <PsmgBadge refText={finding.psmg_ref} />}
      </div>

      <h4 className="font-sans text-sm font-semibold text-ink">
        {finding.title}
      </h4>
      <p className="mt-1 font-sans text-sm leading-relaxed text-ink-muted">
        {finding.description}
      </p>

      <div className="my-3 h-px bg-hairline" />

      <SourceCitation
        sourceDocument={finding.source_document}
        sourceField={finding.source_field}
        psmgRef={finding.psmg_ref}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-[80%] font-sans text-sm text-ink-muted">
          <span className="text-ink-subtle">Action: </span>
          {finding.recommended_action}
        </p>
        <span
          className={`shrink-0 rounded-none border px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wider ${EFFORT_STYLE[finding.rectification_effort]}`}
        >
          {finding.rectification_effort}
        </span>
      </div>
    </div>
  );
}
