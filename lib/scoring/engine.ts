import { Finding, RfiCycleRisk, Severity } from "@/types/report";

/**
 * Severity weights for the readiness index. These are R1GPT triage weights —
 * an editable rubric, not a calibrated probability. They are deliberately
 * transparent (plain subtraction) so a reviewer can read the arithmetic.
 */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  [Severity.LOW]: 4,
  [Severity.MEDIUM]: 12,
  [Severity.HIGH]: 25,
  [Severity.DMAT_TRIGGERING]: 45,
};

/**
 * The highest readiness the automated checklist can award. It is deliberately
 * below 100: passing every R1GPT check is "nothing in our finite checklist
 * fired", which is NOT proof of completeness — a chartered engineer must still
 * review. The reserved headroom (100 − ceiling) represents that un-automatable
 * judgement, so R1GPT never claims a perfect score by construction.
 */
export const CHECKLIST_CEILING = 95;

/**
 * Deterministic readiness index in [0, CHECKLIST_CEILING].
 *
 * readiness = clamp(0 .. ceiling, ceiling − Σ severity_weight)
 *
 * This is a severity-weighted ranking of what to fix first — NOT a calibrated
 * probability of AEMO approval. There is no calibration dataset (AEMO does not
 * publish clause-level R1 outcomes), so the index makes no probabilistic claim.
 *
 * Note the index SATURATES at both ends: a submission with many severe findings
 * floors at 0 and stops discriminating. Among failing submissions the signal
 * lives in the findings list, materiality and RFI-cycle band — not the index.
 */
export function computeReadinessIndex(findings: Finding[]): number {
  const totalWeight = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity],
    0
  );
  return Math.max(0, CHECKLIST_CEILING - totalWeight);
}

/**
 * Qualitative RFI-cycle risk band. Replaces the fabricated P10/P50/P90 month
 * percentiles (which had no empirical anchor). The bands describe relative
 * exposure to additional RFI cycles, not a forecast of elapsed time.
 */
export function computeRfiCycleRisk(findings: Finding[]): RfiCycleRisk {
  const hasDMAT = findings.some(
    (f) => f.severity === Severity.DMAT_TRIGGERING
  );
  const highCount = findings.filter(
    (f) => f.severity === Severity.HIGH
  ).length;

  if (hasDMAT)
    return {
      band: "severe",
      rationale:
        "DMAT-triggering findings historically add multiple RFI cycles before model acceptance.",
    };
  if (highCount >= 3)
    return {
      band: "high",
      rationale:
        "Several high-severity evidence gaps are likely to draw clarifying RFIs across more than one cycle.",
    };
  if (highCount >= 1)
    return {
      band: "elevated",
      rationale:
        "At least one high-severity gap is likely to draw an RFI before acceptance.",
    };
  return {
    band: "minimal",
    rationale:
      "No high-severity or DMAT-triggering findings — RFI exposure is limited to minor clarifications.",
  };
}

export function computeMateriality(
  findings: Finding[]
): "low" | "medium" | "high" | "dmat_triggering" {
  if (findings.some((f) => f.severity === Severity.DMAT_TRIGGERING))
    return "dmat_triggering";
  if (findings.some((f) => f.severity === Severity.HIGH)) return "high";
  if (findings.some((f) => f.severity === Severity.MEDIUM)) return "medium";
  return "low";
}
