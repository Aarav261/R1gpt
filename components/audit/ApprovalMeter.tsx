interface ApprovalMeterProps {
  probability: number; // 0..1
  confidenceInterval: [number, number];
  materialityClass: "low" | "medium" | "high" | "dmat_triggering";
}

function colorFor(p: number): string {
  if (p < 0.4) return "var(--accent-red)";
  if (p < 0.65) return "var(--accent-amber)";
  return "var(--accent-green)";
}

const MATERIALITY_LABEL: Record<
  ApprovalMeterProps["materialityClass"],
  { label: string; desc: string; cls: string }
> = {
  low: {
    label: "LOW MATERIALITY",
    desc: "Minor issues only — submission largely complete.",
    cls: "text-accent-green border-accent-green/50 bg-accent-green/10",
  },
  medium: {
    label: "MEDIUM MATERIALITY",
    desc: "Addressable gaps requiring documentation.",
    cls: "text-accent-blue border-accent-blue/50 bg-accent-blue/10",
  },
  high: {
    label: "HIGH MATERIALITY",
    desc: "Significant evidence gaps likely to draw RFIs.",
    cls: "text-accent-amber border-accent-amber/50 bg-accent-amber/10",
  },
  dmat_triggering: {
    label: "DMAT TRIGGERING",
    desc: "Issues that may require model re-validation / DMAT repetition.",
    cls: "text-accent-red border-accent-red/50 bg-accent-red/10",
  },
};

export function ApprovalMeter({
  probability,
  confidenceInterval,
  materialityClass,
}: ApprovalMeterProps) {
  const pct = Math.round(probability * 100);
  const color = colorFor(probability);

  // Semi-circular gauge geometry.
  const R = 90;
  const CX = 110;
  const CY = 110;
  const circumference = Math.PI * R; // half circle
  const dash = circumference * probability;
  const mat = MATERIALITY_LABEL[materialityClass];

  const lo = Math.round(confidenceInterval[0] * 100);
  const hi = Math.round(confidenceInterval[1] * 100);
  const spread = Math.round(((hi - lo) / 2));

  return (
    <div className="flex flex-col items-center">
      <svg width={220} height={130} viewBox="0 0 220 130">
        {/* Track */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--bg-highlight)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* Value */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text
          x={CX}
          y={CY - 18}
          textAnchor="middle"
          className="font-mono"
          fontSize={40}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {pct}%
        </text>
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          className="font-sans"
          fontSize={11}
          fill="var(--text-secondary)"
        >
          approval probability
        </text>
      </svg>

      <div className="mt-1 font-mono text-sm text-text-secondary">
        {pct}% ± {spread}%{" "}
        <span className="text-text-muted">
          (CI {lo}–{hi}%)
        </span>
      </div>

      <div
        className={`mt-4 rounded border px-3 py-2 text-center ${mat.cls}`}
      >
        <div className="font-mono text-xs font-semibold tracking-wider">
          {mat.label}
        </div>
        <div className="mt-0.5 font-sans text-xs opacity-90">{mat.desc}</div>
      </div>
    </div>
  );
}
