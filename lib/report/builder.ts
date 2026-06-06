import { nanoid } from "nanoid";
import OpenAI from "openai";
import {
  DocumentType,
  UploadedDocument,
} from "@/types/documents";
import { AuditReport, Finding } from "@/types/report";
import { runAssessors } from "@/lib/assessors/runner";
import { getGPS } from "@/lib/assessors/helpers";
import {
  computeApprovalProbability,
  computeConfidenceInterval,
  computeMateriality,
  computeTimeToApproval,
} from "@/lib/scoring/engine";
import { generateRFIs } from "./rfi";

/** Derive the missing-evidence checklist from findings flagged absent. */
function buildMissingEvidence(findings: Finding[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of findings) {
    if (f.evidence_present) continue;
    const label = f.psmg_ref
      ? `${f.title} (PSMG ${f.psmg_ref.split(" — ")[0]})`
      : f.title;
    if (!seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

/** Ordered, de-duplicated rectification actions, highest severity first. */
function buildRecommendedActions(findings: Finding[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of findings) {
    const action = `${f.recommended_action} [${f.finding_id} · ${f.rectification_effort}]`;
    if (!seen.has(action)) {
      seen.add(action);
      out.push(action);
    }
  }
  return out;
}

export interface BuildHooks {
  onAssessmentComplete?: (findingCount: number) => void;
  onScoringComplete?: (probability: number) => void;
}

export async function buildAuditReport(
  openai: OpenAI,
  project_name: string,
  docs: UploadedDocument[],
  hooks: BuildHooks = {}
): Promise<AuditReport> {
  const { findings, scorecard } = await runAssessors(docs);
  hooks.onAssessmentComplete?.(findings.length);

  const approval_probability = computeApprovalProbability(findings);
  const confidence_interval = computeConfidenceInterval(
    approval_probability,
    findings.length
  );
  const time_to_approval_months = computeTimeToApproval(findings);
  const materiality_class = computeMateriality(findings);
  hooks.onScoringComplete?.(approval_probability);

  const gps = getGPS(docs);
  const predicted_rfi_questions = await generateRFIs(
    openai,
    findings,
    project_name,
    gps?.technology_type ?? null
  );

  return {
    audit_id: nanoid(),
    project_name,
    timestamp: new Date().toISOString(),
    approval_probability,
    confidence_interval,
    materiality_class,
    findings,
    missing_evidence: buildMissingEvidence(findings),
    predicted_rfi_questions,
    recommended_actions: buildRecommendedActions(findings),
    time_to_approval_months,
    clause_scorecard: scorecard,
    psmg_version: "3.0",
  };
}

export const REQUIRED_DOC_TYPES = [
  DocumentType.GPS_BASELINE,
  DocumentType.FAT_REPORT,
  DocumentType.OEM_METADATA,
];
