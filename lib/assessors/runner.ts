import { UploadedDocument } from "@/types/documents";
import { CheckResult, ClauseStatus, Finding } from "@/types/report";
import { runDelta } from "./delta";
import { runClause } from "./clause";
import { runEvidence } from "./evidence";
import { runFirmware } from "./firmware";
import { runNSP } from "./nsp";
import { runModelAdequacy } from "./model_adequacy";
import { getFAT, getGPS, getOEM, SEVERITY_ORDER } from "./helpers";

export interface AssessmentResult {
  findings: Finding[];
  scorecard: Record<string, ClauseStatus>;
  checks: CheckResult[];
}

/**
 * Run all six assessors concurrently and return findings sorted by severity
 * (descending) together with the clause scorecard.
 *
 * Assessors are synchronous pure functions; we wrap them in Promise.all so the
 * pipeline reads as a parallel fan-out and stays trivial to extend with an
 * async (AI-backed) assessor later.
 */
export async function runAssessors(
  docs: UploadedDocument[]
): Promise<AssessmentResult> {
  const [deltaF, clauseR, evidenceF, firmwareF, nspF, modelF] =
    await Promise.all([
      Promise.resolve(runDelta(docs)),
      Promise.resolve(runClause(docs)),
      Promise.resolve(runEvidence(docs)),
      Promise.resolve(runFirmware(docs)),
      Promise.resolve(runNSP(docs)),
      Promise.resolve(runModelAdequacy(docs)),
    ]);

  const findings = [
    ...deltaF,
    ...clauseR.findings,
    ...evidenceF,
    ...firmwareF,
    ...nspF,
    ...modelF,
  ].sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]);

  // Per-assessor coverage. An assessor is "applicable" only when it had the
  // inputs it needs; otherwise it is excluded from the coverage denominator
  // rather than silently counted as a pass. A check "passed" when it was
  // applicable and emitted no findings.
  const gps = getGPS(docs);
  const fat = getFAT(docs);
  const oem = getOEM(docs);
  const checks: CheckResult[] = [
    { name: "delta", label: "As-built vs design deltas", applicable: !!(gps && fat), findings: deltaF },
    { name: "clause", label: "Clause evidence matrix", applicable: true, findings: clauseR.findings },
    { name: "evidence", label: "Mandatory artefacts", applicable: !!(gps || fat), findings: evidenceF },
    { name: "firmware", label: "Firmware vs DMAT baseline", applicable: !!oem, findings: firmwareF },
    { name: "nsp", label: "GPS baseline currency", applicable: !!gps?.agreed_gps_date, findings: nspF },
    { name: "model_adequacy", label: "EMT/RMS model adequacy", applicable: !!gps, findings: modelF },
  ].map(({ name, label, applicable, findings: f }) => ({
    name,
    label,
    applicable,
    passed: applicable && f.length === 0,
  }));

  return { findings, scorecard: clauseR.scorecard, checks };
}
