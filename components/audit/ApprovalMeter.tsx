interface ApprovalMeterProps {
  probability: number; // 0..1
  confidenceInterval: [number, number];
  materialityClass: "low" | "medium" | "high" | "dmat_triggering";
}

function colorFor(p: number): string {
  if (p < 0.4) return "var(--error)";
  if (p < 0.65) return "var(--warning)";
  return "var(--success)";
}

const MATERIALITY_LABEL: Record<
  ApprovalMeterProps["materialityClass"],
  { label: string; desc: string; cls: string }
> = {
  low: {
    label: "LOW MATERIALITY",
    desc: "Minor issues only — submission largely complete.",
    cls: "text-[#0e6027] border-success bg-[#defbe6]",
  },
  medium: {
    label: "MEDIUM MATERIALITY",
    desc: "Addressable gaps requiring documentation.",
    cls: "text-[#002d9c] border-ibm-blue bg-[#d0e2ff]",
  },
  high: {
    label: "HIGH MATERIALITY",
    desc: "Significant evidence gaps likely to draw RFIs.",
    cls: "text-[#684e00] border-warning bg-[#fcf4d6]",
  },
  dmat_triggering: {
    label: "DMAT TRIGGERING",
    desc: "Issues that may require model re-validation / DMAT repetition.",
    cls: "text-[#a2191f] border-error bg-[#fff1f1]",
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
  const spread = Math.round((hi - lo) / 2);

  return (
    <div className="flex flex-col items-center">
      <svg width={220} height={130} viewBox="0 0 220 130">
        {/* Track */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={14}
        />
        {/* Value */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text
          x={CX}
          y={CY - 18}
          textAnchor="middle"
          className="font-mono"
          fontSize={40}
          fontWeight={600}
          fill="var(--ink)"
        >
          {pct}%
        </text>
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          className="font-sans"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          approval probability
        </text>
      </svg>

      <div className="mt-1 font-mono text-sm text-ink-muted">
        {pct}% ± {spread}%{" "}
        <span className="text-ink-subtle">
          (CI {lo}–{hi}%)
        </span>
      </div>

      <div className={`mt-4 border px-3 py-2 text-center ${mat.cls}`}>
        <div className="font-sans text-xs font-semibold">{mat.label}</div>
        <div className="mt-0.5 font-sans text-xs opacity-90">{mat.desc}</div>
      </div>
    </div>
  );
}
