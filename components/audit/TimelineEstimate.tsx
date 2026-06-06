import { TimeToApproval } from "@/types/report";

interface TimelineEstimateProps {
  estimate: TimeToApproval;
  findingCount: number;
  dmatCount: number;
}

export function TimelineEstimate({
  estimate,
  findingCount,
  dmatCount,
}: TimelineEstimateProps) {
  const { p10, p50, p90 } = estimate;
  const max = Math.max(p90, 24);
  const pos = (m: number) => `${(m / max) * 100}%`;

  const markers: { key: keyof TimeToApproval; label: string; m: number }[] = [
    { key: "p10", label: "P10", m: p10 },
    { key: "p50", label: "P50", m: p50 },
    { key: "p90", label: "P90", m: p90 },
  ];

  return (
    <div>
      <div className="relative mt-8 mb-10 h-2 rounded-full bg-bg-highlight">
        <div
          className="absolute h-2 rounded-full bg-gradient-to-r from-accent-green via-accent-amber to-accent-red"
          style={{ left: pos(p10), right: `${100 - (p90 / max) * 100}%` }}
        />
        {markers.map((mk) => (
          <div
            key={mk.key}
            className="absolute -top-1 flex -translate-x-1/2 flex-col items-center"
            style={{ left: pos(mk.m) }}
          >
            <div className="h-4 w-1 rounded bg-text-primary" />
            <div className="mt-1 whitespace-nowrap font-mono text-[11px] text-text-secondary">
              {mk.label}
            </div>
            <div className="font-mono text-sm font-semibold text-text-primary">
              {mk.m}mo
            </div>
          </div>
        ))}
      </div>

      <p className="font-sans text-xs text-text-muted">
        Based on {findingCount} findings including {dmatCount} DMAT-triggering
        items. Audited against PSMG v3.0.
      </p>
    </div>
  );
}
