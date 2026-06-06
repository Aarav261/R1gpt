import { nanoid } from "nanoid";
import OpenAI from "openai";
import {
  DocumentType,
  UploadedDocument,
} from "@/types/documents";
import { AuditReport, Finding } from "@/types/report";
import { runAssessors } from "@/lib/assessors/runner";
import { getGPS, getOEM } from "@/lib/assessors/helpers";
import {
  CHECKLIST_CEILING,
  computeMateriality,
  computeReadinessIndex,
  computeRfiCycleRisk,
} from "@/lib/scoring/engine";
import { generateRFIs } from "./rfi";

/** Document types that carry a schema-backed extraction model. */
const SCHEMA_BACKED_DOC_TYPES = new Set<DocumentType>([
  DocumentType.GPS_BASELINE,
  DocumentType.FAT_REPORT,
  DocumentType.OEM_METADATA,
]);

const DOC_TYPE_LABEL: Partial<Record<DocumentType, string>> = {
  [DocumentType.GPS_BASELINE]: "GPS baseline",
  [DocumentType.FAT_REPORT]: "FAT report",
  [DocumentType.OEM_METADATA]: "OEM metadata",
};

/**
 * Surface schema-backed documents whose extraction returned null (LLM output
 * failed Zod validation, or parsing/AI errored). These are excluded from clause
 * assessment, so naming them turns an invisible server log into a visible
 * honesty signal in the report.
 */
function buildExtractionWarnings(docs: UploadedDocument[]): string[] {
  const out: string[] = [];
  for (const d of docs) {
    if (SCHEMA_BACKED_DOC_TYPES.has(d.doc_type) && d.extracted == null) {
      const label = DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type;
      out.push(
        `${label} (${d.filename}) could not be structured — extraction failed schema validation and was excluded from clause assessment. Findings for this document may be incomplete.`
      );
    }
  }
  return out;
}

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
  onScoringComplete?: (readinessIndex: number) => void;
}

export async function buildAuditReport(
  openai: OpenAI,
  project_name: string,
  docs: UploadedDocument[],
  hooks: BuildHooks = {}
): Promise<AuditReport> {
  const { findings, scorecard, checks } = await runAssessors(docs);
  hooks.onAssessmentComplete?.(findings.length);

  const readiness_index = computeReadinessIndex(findings);
  const rfi_cycle_risk = computeRfiCycleRisk(findings);
  const materiality_class = computeMateriality(findings);
  hooks.onScoringComplete?.(readiness_index);

  const gps = getGPS(docs);
  const predicted_rfi_questions = await generateRFIs(
    openai,
    findings,
    project_name,
    gps?.technology_type ?? null
  );

  const oem = getOEM(docs);

  return {
    audit_id: nanoid(),
    project_name,
    timestamp: new Date().toISOString(),
    readiness_index,
    readiness_ceiling: CHECKLIST_CEILING,
    materiality_class,
    findings,
    checks,
    missing_evidence: buildMissingEvidence(findings),
    predicted_rfi_questions,
    recommended_actions: buildRecommendedActions(findings),
    rfi_cycle_risk,
    clause_scorecard: scorecard,
    extraction_warnings: buildExtractionWarnings(docs),
    documents: docs.map((d) => ({
      doc_type: d.doc_type,
      filename: d.filename,
      schema_backed: SCHEMA_BACKED_DOC_TYPES.has(d.doc_type),
      extracted: d.extracted != null,
    })),
    oem_summary: oem
      ? {
          vendor: oem.vendor,
          model_name: oem.model_name,
          firmware_version: oem.firmware_version,
          dmat_baseline_version: oem.dmat_baseline_version,
        }
      : null,
    psmg_version: "3.0",
  };
}

export const REQUIRED_DOC_TYPES = [
  DocumentType.GPS_BASELINE,
  DocumentType.FAT_REPORT,
  DocumentType.OEM_METADATA,
];
