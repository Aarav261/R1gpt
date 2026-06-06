import { DocumentType, UploadedDocument } from "@/types/documents";
import { ClauseStatus, Finding, Severity } from "@/types/report";
import { getGPS } from "./helpers";

interface ClauseSpec {
  label: string;
  required: DocumentType[];
  psmg_ref: string;
  note?: string;
}

export const CLAUSE_EVIDENCE_MATRIX: Record<string, ClauseSpec> = {
  "S5.2.5.2": {
    label: "Quality of supply",
    required: [DocumentType.FAT_REPORT, DocumentType.PSCAD_REPORT],
    psmg_ref: "Section 4.1 — Load flow model inclusions (Table 4)",
    note: "Winding impedances positive/negative/zero sequence required",
  },
  "S5.2.5.2_harmonic": {
    label: "Harmonic compliance",
    required: [DocumentType.FAT_REPORT],
    psmg_ref: "Section 4.6.1 — Harmonic emissions",
    note: "Norton equivalents and harmonic current injection profiles required",
  },
  "S5.2.5.9": {
    label: "Protection systems",
    required: [DocumentType.FAT_REPORT],
    psmg_ref: "Section 5.2.2 — RMS model block diagrams",
    note: "Block diagrams mandatory — black-box approach not acceptable",
  },
  "S5.2.5.11": {
    label: "Frequency control",
    required: [DocumentType.PSCAD_REPORT, DocumentType.OEM_METADATA],
    psmg_ref: "Section 4.3.2 — Frequency control requirements",
  },
  "S5.2.5.13": {
    label: "Voltage and reactive power",
    required: [DocumentType.PSCAD_REPORT, DocumentType.FAT_REPORT],
    psmg_ref: "Section 4.3 — RMS and EMT stability model requirements",
  },
  "S5.2.5.14": {
    label: "Active power control",
    required: [DocumentType.PSCAD_REPORT],
    psmg_ref: "Section 4.3 — RMS and EMT stability model requirements",
  },
  "S5.2.5.15": {
    label: "Short circuit ratio",
    required: [DocumentType.FAT_REPORT, DocumentType.PSCAD_REPORT],
    psmg_ref: "Section 4.2 — Fault level model (IEC 60909:2016)",
    note: "SCR > 10 may qualify for EMT model exemption per Section 3.4",
  },
  "S5.2.8": {
    label: "Fault ride-through",
    required: [DocumentType.PSCAD_REPORT, DocumentType.FAT_REPORT],
    psmg_ref: "Section 6.3 — Model validation and confirmation",
    note: "EMT model required for IBR; R2 validation tests required on-site",
  },
};

/** Clauses surfaced in the report scorecard (canonical NER references). */
export const SCORECARD_CLAUSES = [
  "S5.2.5.2",
  "S5.2.5.9",
  "S5.2.5.11",
  "S5.2.5.13",
  "S5.2.5.14",
  "S5.2.5.15",
  "S5.2.8",
] as const;

function statusFor(
  required: DocumentType[],
  present: Set<DocumentType>
): ClauseStatus {
  const have = required.filter((r) => present.has(r));
  if (have.length === 0) return "missing";
  if (have.length === required.length) return "pass";
  return "partial";
}

export interface ClauseResult {
  findings: Finding[];
  scorecard: Record<string, ClauseStatus>;
}

/**
 * Clause assessor — builds an evidence matrix from PSMG v3.0 and determines
 * pass/partial/missing/fail status per NER S5.2 clause based on which document
 * types are present in the submission package.
 */
export function runClause(docs: UploadedDocument[]): ClauseResult {
  const present = new Set<DocumentType>(
    docs.filter((d) => d.raw_text?.trim().length).map((d) => d.doc_type)
  );
  const gps = getGPS(docs);
  const addressed = new Set(gps?.clauses ?? []);

  const findings: Finding[] = [];
  const scorecard: Record<string, ClauseStatus> = {};

  for (const clause of SCORECARD_CLAUSES) {
    const spec = CLAUSE_EVIDENCE_MATRIX[clause];
    let status = statusFor(spec.required, present);

    // A clause the applicant claims to address but lacks evidence for is a
    // FAIL (asserted-but-unsupported), distinct from MISSING (not claimed).
    if (status === "missing" && addressed.has(clause)) {
      status = "fail";
    }

    scorecard[clause] = status;

    if (status === "partial" || status === "fail" || status === "missing") {
      const missingDocs = spec.required.filter((r) => !present.has(r));
      const sev =
        status === "fail"
          ? Severity.HIGH
          : status === "partial"
            ? Severity.MEDIUM
            : Severity.LOW;
      findings.push({
        finding_id: `CLAUSE-${clause}`,
        assessor: "clause",
        clause,
        psmg_ref: spec.psmg_ref,
        title: `${clause} ${spec.label} — evidence ${status}`,
        description: `${spec.label} requires ${spec.required.join(
          ", "
        )}. Missing: ${missingDocs.join(", ") || "none"}.${
          spec.note ? ` ${spec.note}.` : ""
        }`,
        severity: sev,
        evidence_present: status === "partial",
        source_document: "gps_baseline",
        source_field: "clauses",
        recommended_action: `Provide the outstanding evidence (${
          missingDocs.join(", ") || "supporting studies"
        }) to substantiate ${clause} per ${spec.psmg_ref}.`,
        rectification_effort: "weeks",
      });
    }
  }

  return { findings, scorecard };
}
