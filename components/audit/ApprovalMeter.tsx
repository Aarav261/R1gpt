interface ApprovalMeterProps {
  readinessIndex: number; // 0..ceiling
  readinessCeiling: number; // max the checklist can award (<100)
  checksPassed: number;
  checksApplicable: number;
  materialityClass: "low" | "medium" | "high" | "dmat_triggering";
}

function colorFor(index: number): string {
  if (index < 40) return "var(--error)";
  if (index < 65) return "var(--warning)";
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
  readinessIndex,
  readinessCeiling,
  checksPassed,
  checksApplicable,
  materialityClass,
}: ApprovalMeterProps) {
  const index = Math.round(readinessIndex);
  const frac = Math.max(0, Math.min(1, index / 100));
  const color = colorFor(index);

  // Semi-circular gauge geometry.
  const R = 90;
  const CX = 110;
  const CY = 110;
  const circumference = Math.PI * R; // half circle
  const dash = circumference * frac;
  const mat = MATERIALITY_LABEL[materialityClass];

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
          {index}
        </text>
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          className="font-sans"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          readiness index / 100
        </text>
      </svg>

      <div className="mt-1 font-mono text-sm text-ink-muted">
        {checksPassed} of {checksApplicable} checks passed
      </div>

      <div className="mt-2 max-w-[280px] text-center font-sans text-[11px] leading-relaxed text-ink-subtle">
        Severity-weighted readiness ranking — illustrative, not a forecast of
        AEMO&apos;s decision. Caps at {readinessCeiling}: passing every automated
        check is not a completeness guarantee, and the index saturates at 0 once
        findings stack up — the findings list is the real signal.
      </div>

      <div className={`mt-4 border px-3 py-2 text-center ${mat.cls}`}>
        <div className="font-sans text-xs font-semibold">{mat.label}</div>
        <div className="mt-0.5 font-sans text-xs opacity-90">{mat.desc}</div>
      </div>
    </div>
  );
}
