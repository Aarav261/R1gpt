import { UploadedDocument } from "@/types/documents";
import { Finding, Severity } from "@/types/report";
import { getFAT, getGPS } from "./helpers";

/**
 * Evidence assessor — checks for the presence of mandatory PSMG v3.0
 * submission artefacts: harmonic filter design (4.6.1), transfer function
 * block diagrams (5.2.2) and the Releasable User Guide (5.1).
 */
export function runEvidence(docs: UploadedDocument[]): Finding[] {
  const findings: Finding[] = [];
  const fat = getFAT(docs);
  const gps = getGPS(docs);

  if (fat && !fat.filter_design_included) {
    findings.push({
      finding_id: "EVID-001",
      assessor: "evidence",
      clause: "S5.2.5.2",
      psmg_ref:
        "Section 4.6.1 — Harmonic emissions (Norton equivalents required)",
      title: "Harmonic filter design report absent",
      description:
        "PSMG Section 4.6.1 requires frequency-dependent Norton equivalents and harmonic current injection profiles per loading level. No filter design report is included in the FAT package.",
      severity: Severity.HIGH,
      evidence_present: false,
      source_document: "fat_report",
      source_field: "filter_design_included",
      recommended_action:
        "Provide frequency-dependent Norton equivalents and harmonic current injection profiles per PSMG Section 4.6.1.",
      rectification_effort: "weeks",
    });
  }

  if (fat && !fat.block_diagrams_provided) {
    findings.push({
      finding_id: "EVID-002",
      assessor: "evidence",
      clause: "S5.2.5.9",
      psmg_ref: "Section 5.2.2 — RMS model block diagrams",
      title: "Transfer function block diagrams not provided",
      description:
        "PSMG Section 5.2.2 explicitly states black-box representation of individual transfer function blocks is not acceptable.",
      severity: Severity.HIGH,
      evidence_present: false,
      source_document: "fat_report",
      source_field: "block_diagrams_provided",
      recommended_action:
        "Provide Laplacian transfer function block diagrams showing all functional controllers and plant per PSMG Section 5.2.2.",
      rectification_effort: "weeks",
    });
  }

  const rugReferenced = gps?.rug_referenced ?? false;
  const rugProvided = fat?.rug_provided ?? false;
  if (!rugReferenced && !rugProvided && (gps || fat)) {
    findings.push({
      finding_id: "EVID-003",
      assessor: "evidence",
      clause: null,
      psmg_ref: "Section 5.1 — Releasable user guide",
      title: "Releasable User Guide not referenced in submission",
      description:
        "PSMG Section 5.1 requires a Releasable User Guide as a mandatory submission. No reference was found in the GPS baseline or FAT report.",
      severity: Severity.MEDIUM,
      evidence_present: false,
      source_document: gps ? "gps_baseline" : "fat_report",
      source_field: "rug_referenced",
      recommended_action:
        "Prepare and submit the Releasable User Guide describing model usage, limitations and initialisation per PSMG Section 5.1.",
      rectification_effort: "days",
    });
  }

  return findings;
}
