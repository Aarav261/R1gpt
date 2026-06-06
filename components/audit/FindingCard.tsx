import { Finding } from "@/types/report";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { PsmgBadge } from "@/components/ui/PsmgBadge";
import { SourceCitation } from "@/components/ui/SourceCitation";

const EFFORT_STYLE: Record<Finding["rectification_effort"], string> = {
  hours: "text-accent-green border-accent-green/40",
  days: "text-accent-blue border-accent-blue/40",
  weeks: "text-accent-amber border-accent-amber/40",
  months: "text-accent-red border-accent-red/40",
};

export function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-text-secondary">
          {finding.finding_id}
        </span>
        <SeverityBadge severity={finding.severity} />
        {finding.clause && (
          <span className="rounded border border-border bg-bg-highlight px-2 py-0.5 font-mono text-[11px] text-text-secondary">
            {finding.clause}
          </span>
        )}
        {finding.psmg_ref && <PsmgBadge refText={finding.psmg_ref} />}
      </div>

      <h4 className="font-sans text-sm font-semibold text-text-primary">
        {finding.title}
      </h4>
      <p className="mt-1 font-sans text-sm leading-relaxed text-text-secondary">
        {finding.description}
      </p>

      <div className="my-3 h-px bg-border" />

      <SourceCitation
        sourceDocument={finding.source_document}
        sourceField={finding.source_field}
        psmgRef={finding.psmg_ref}
      />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-[80%] font-sans text-sm text-text-secondary">
          <span className="text-text-muted">Action: </span>
          {finding.recommended_action}
        </p>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${EFFORT_STYLE[finding.rectification_effort]}`}
        >
          {finding.rectification_effort}
        </span>
      </div>
    </div>
  );
}
