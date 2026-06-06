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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-subtle">
      <span className="text-ink-subtle">Source:</span>
      <span className="text-ink-muted">
        {sourceDocument ?? "—"}
      </span>
      {sourceField && (
        <>
          <span className="text-ink-subtle">→</span>
          <span className="text-ink-muted">{sourceField}</span>
        </>
      )}
      {psmgRef && (
        <>
          <span className="text-ink-subtle">·</span>
          <PsmgBadge refText={psmgRef} />
        </>
      )}
    </div>
  );
}
