interface DifferentiatorCalloutProps {
  findingCount: number;
  dmatCount: number;
  highCount: number;
  probability: number; // 0..1
}

/**
 * The "Why not just ask ChatGPT?" box. This is the component that visually
 * answers the judge's question — it contrasts a conversational LLM with a
 * deterministic, PSMG-grounded audit engine using the run's real numbers.
 */
export function DifferentiatorCallout({
  findingCount,
  dmatCount,
  highCount,
  probability,
}: DifferentiatorCalloutProps) {
  const pct = Math.round(probability * 100);
  return (
    <div className="border border-hairline border-l-2 border-l-ibm-blue bg-surface-1 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-sans text-sm font-semibold text-ibm-blue">
          Why not just ask ChatGPT?
        </span>
      </div>
      <p className="font-sans text-sm leading-relaxed text-ink-muted">
        A general LLM would read your documents and offer opinions.{" "}
        <span className="text-ink">R1GPT ran {findingCount}</span>{" "}
        deterministic checks grounded in AEMO&apos;s Power System Model
        Guidelines v3.0. It found{" "}
        <span className="font-mono text-error">{dmatCount}</span>{" "}
        DMAT-triggering and{" "}
        <span className="font-mono text-warning">{highCount}</span>{" "}
        high-severity issues — each traceable to a specific document field and
        PSMG section. The{" "}
        <span className="font-mono text-ink">{pct}%</span> approval
        probability reflects a severity-weighted penalty across all findings,
        not a sentiment score.
      </p>
    </div>
  );
}
