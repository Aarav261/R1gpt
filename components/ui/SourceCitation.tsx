import { PsmgBadge } from "./PsmgBadge";

interface SourceCitationProps {
  sourceDocument: string | null;
  sourceField: string | null;
  psmgRef?: string | null;
}

/**
 * Shows the traceable evidence chain for a finding: which document, which
 * field, and the PSMG section it maps to. This is the visual proof that every
 * finding cites an exact source — not an LLM opinion.
 */
export function SourceCitation({
  sourceDocument,
  sourceField,
  psmgRef,
}: SourceCitationProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-text-muted">
      <span className="text-text-muted">Source:</span>
      <span className="text-text-secondary">
        {sourceDocument ?? "—"}
      </span>
      {sourceField && (
        <>
          <span className="text-text-muted">→</span>
          <span className="text-text-secondary">{sourceField}</span>
        </>
      )}
      {psmgRef && (
        <>
          <span className="text-text-muted">·</span>
          <PsmgBadge refText={psmgRef} />
        </>
      )}
    </div>
  );
}
