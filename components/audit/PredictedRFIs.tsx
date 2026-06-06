import { PsmgBadge } from "@/components/ui/PsmgBadge";

/** Pull the first "Section X.Y" / "§X.Y" / "Sx.x.x" reference from a question. */
function extractRef(q: string): string | null {
  const psmg = q.match(/(?:Section|§)\s*([0-9]+(?:\.[0-9]+)*)/i);
  if (psmg) return `Section ${psmg[1]}`;
  return null;
}

export function PredictedRFIs({ questions }: { questions: string[] }) {
  return (
    <div>
      <p className="mb-4 font-sans text-sm text-text-secondary">
        Questions AEMO or your NSP is likely to raise. Each cites the PSMG
        section that grounds the question.
      </p>
      <div className="space-y-3">
        {questions.map((q, i) => {
          const ref = extractRef(q);
          return (
            <div
              key={i}
              className="rounded-r-lg border-l-2 border-accent-blue bg-bg-surface py-3 pl-4 pr-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-xs text-text-muted">
                  RFI-{String(i + 1).padStart(2, "0")}
                </span>
                {ref && <PsmgBadge refText={ref} />}
              </div>
              <p className="font-mono text-sm leading-relaxed text-text-secondary">
                {q}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
