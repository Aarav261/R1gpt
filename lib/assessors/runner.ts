import { UploadedDocument } from "@/types/documents";
import { ClauseStatus, Finding } from "@/types/report";
import { runDelta } from "./delta";
import { runClause } from "./clause";
import { runEvidence } from "./evidence";
import { runFirmware } from "./firmware";
import { runNSP } from "./nsp";
import { runModelAdequacy } from "./model_adequacy";
import { SEVERITY_ORDER } from "./helpers";

export interface AssessmentResult {
  findings: Finding[];
  scorecard: Record<string, ClauseStatus>;
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

  return { findings, scorecard: clauseR.scorecard };
}
