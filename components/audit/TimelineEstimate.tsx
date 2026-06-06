import { RfiCycleRisk, RfiCycleRiskBand } from "@/types/report";

interface TimelineEstimateProps {
  risk: RfiCycleRisk;
  findingCount: number;
  dmatCount: number;
}

const BANDS: RfiCycleRiskBand[] = ["minimal", "elevated", "high", "severe"];

const BAND_STYLE: Record<
  RfiCycleRiskBand,
  { label: string; dot: string; cls: string }
> = {
  minimal: {
    label: "MINIMAL",
    dot: "bg-success",
    cls: "text-[#0e6027] border-success bg-[#defbe6]",
  },
  elevated: {
    label: "ELEVATED",
    dot: "bg-ibm-blue",
    cls: "text-[#002d9c] border-ibm-blue bg-[#d0e2ff]",
  },
  high: {
    label: "HIGH",
    dot: "bg-warning",
    cls: "text-[#684e00] border-warning bg-[#fcf4d6]",
  },
  severe: {
    label: "SEVERE",
    dot: "bg-error",
    cls: "text-[#a2191f] border-error bg-[#fff1f1]",
  },
};

export function TimelineEstimate({
  risk,
  findingCount,
  dmatCount,
}: TimelineEstimateProps) {
  const activeIndex = BANDS.indexOf(risk.band);

  return (
    <div>
      {/* Band scale */}
      <div className="mt-2 flex gap-1">
        {BANDS.map((b, i) => {
          const style = BAND_STYLE[b];
          const active = i === activeIndex;
          return (
            <div
              key={b}
              className={`flex-1 border px-2 py-2 text-center transition-opacity ${
                active ? style.cls : "border-hairline bg-surface-1 opacity-40"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                <span className="font-mono text-[11px] font-semibold">
                  {style.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 font-sans text-sm text-ink-muted">{risk.rationale}</p>

      <p className="mt-2 font-sans text-xs text-ink-subtle">
        Based on {findingCount} findings including {dmatCount} DMAT-triggering
        items. This is a qualitative RFI-cycle risk band, not a calendar
        forecast — R1GPT does not predict elapsed time to approval. Audited
        against PSMG v3.0.
      </p>
    </div>
  );
}
