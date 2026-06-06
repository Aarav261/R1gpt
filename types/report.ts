export enum Severity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  DMAT_TRIGGERING = "dmat_triggering",
}

export type RectificationEffort = "hours" | "days" | "weeks" | "months";

export interface Finding {
  finding_id: string;
  assessor: string;
  clause: string | null;
  psmg_ref: string | null;
  title: string;
  description: string;
  severity: Severity;
  evidence_present: boolean;
  source_document: string | null;
  source_field: string | null;
  recommended_action: string;
  rectification_effort: RectificationEffort;
}

export type ClauseStatus = "pass" | "fail" | "partial" | "missing";

export type RfiCycleRiskBand = "minimal" | "elevated" | "high" | "severe";

export interface RfiCycleRisk {
  band: RfiCycleRiskBand;
  rationale: string;
}

/**
 * Per-assessor check result. `applicable` is false when the assessor lacked the
 * inputs it needs (e.g. no FAT report for the impedance-delta check), so it is
 * excluded from the "X of N checks passed" coverage denominator rather than
 * silently counted as a pass.
 */
export interface CheckResult {
  name: string;
  label: string;
  applicable: boolean;
  passed: boolean;
}

/** Lightweight per-document summary of what was uploaded, for workspace views. */
export interface ReportDocument {
  doc_type: string;
  filename: string;
  /** Whether this document type carries a schema-backed extraction model. */
  schema_backed: boolean;
  /** True when structured extraction produced a model (not just raw text). */
  extracted: boolean;
}

/** Parsed OEM model identity, surfaced when OEM metadata extraction succeeds. */
export interface OemSummary {
  vendor: string | null;
  model_name: string | null;
  firmware_version: string | null;
  dmat_baseline_version: string | null;
}

export interface AuditReport {
  audit_id: string;
  project_name: string;
  timestamp: string;
  /**
   * Deterministic readiness index in [0, readiness_ceiling] — a severity-weighted
   * ranking of what to fix first, NOT a calibrated probability of AEMO approval.
   */
  readiness_index: number;
  /** Max the automated checklist can award (<100; reserved for engineer review). */
  readiness_ceiling: number;
  materiality_class: "low" | "medium" | "high" | "dmat_triggering";
  findings: Finding[];
  /** Per-assessor pass/applicable breakdown behind the readiness index. */
  checks: CheckResult[];
  missing_evidence: string[];
  predicted_rfi_questions: string[];
  recommended_actions: string[];
  /** Qualitative RFI-cycle risk band — replaces fabricated month percentiles. */
  rfi_cycle_risk: RfiCycleRisk;
  clause_scorecard: Record<string, ClauseStatus>;
  /** Schema-backed documents whose extraction returned null (honesty signal). */
  extraction_warnings: string[];
  /** Lightweight summary of the uploaded documents (for workspace views). */
  documents?: ReportDocument[];
  /** Parsed OEM model identity, when OEM metadata extraction succeeded. */
  oem_summary?: OemSummary | null;
  psmg_version: "3.0";
}
