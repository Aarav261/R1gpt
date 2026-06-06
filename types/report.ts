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

export interface TimeToApproval {
  p10: number;
  p50: number;
  p90: number;
}

export interface AuditReport {
  audit_id: string;
  project_name: string;
  timestamp: string;
  approval_probability: number;
  confidence_interval: [number, number];
  materiality_class: "low" | "medium" | "high" | "dmat_triggering";
  findings: Finding[];
  missing_evidence: string[];
  predicted_rfi_questions: string[];
  recommended_actions: string[];
  time_to_approval_months: TimeToApproval;
  clause_scorecard: Record<string, ClauseStatus>;
  psmg_version: "3.0";
}
