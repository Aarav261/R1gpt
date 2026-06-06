import { Finding, Severity, TimeToApproval } from "@/types/report";

export const SEVERITY_PENALTY: Record<Severity, number> = {
  [Severity.LOW]: 0.04,
  [Severity.MEDIUM]: 0.12,
  [Severity.HIGH]: 0.25,
  [Severity.DMAT_TRIGGERING]: 0.45,
};

function sigmoidSqueeze(raw: number): number {
  return 1 / (1 + Math.exp(-6 * (raw - 0.5)));
}

/** Severity-weighted approval probability in [0, 1], rounded to 2 dp. */
export function computeApprovalProbability(findings: Finding[]): number {
  const totalPenalty = findings.reduce(
    (sum, f) => sum + SEVERITY_PENALTY[f.severity],
    0
  );
  const raw = Math.max(0, 1 - totalPenalty);
  const squeezed = sigmoidSqueeze(raw);
  return Math.round(squeezed * 100) / 100;
}

export function computeConfidenceInterval(
  probability: number,
  findingCount: number
): [number, number] {
  const spread = Math.max(0.05, 0.15 - findingCount * 0.01);
  return [
    Math.max(0.01, Math.round((probability - spread) * 100) / 100),
    Math.min(0.99, Math.round((probability + spread) * 100) / 100),
  ];
}

export function computeTimeToApproval(findings: Finding[]): TimeToApproval {
  const hasDMAT = findings.some(
    (f) => f.severity === Severity.DMAT_TRIGGERING
  );
  const highCount = findings.filter(
    (f) => f.severity === Severity.HIGH
  ).length;

  if (hasDMAT) return { p10: 8, p50: 14, p90: 24 };
  if (highCount >= 3) return { p10: 5, p50: 10, p90: 18 };
  if (highCount >= 1) return { p10: 3, p50: 7, p90: 13 };
  return { p10: 1, p50: 3, p90: 6 };
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
