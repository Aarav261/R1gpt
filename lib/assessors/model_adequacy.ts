import { UploadedDocument } from "@/types/documents";
import { Finding, Severity } from "@/types/report";
import { getFAT, getGPS } from "./helpers";

const IBR_TECH = new Set(["solar", "wind", "BESS", "hybrid"]);

/**
 * Model adequacy assessor — grounded entirely in PSMG Section 4.3 (EMT/RMS
 * model requirements) and Section 3.4 (SCR > 10 exemption threshold).
 */
export function runModelAdequacy(docs: UploadedDocument[]): Finding[] {
  const findings: Finding[] = [];
  const gps = getGPS(docs);
  const fat = getFAT(docs);
  if (!gps) return findings;

  const tech = gps.technology_type;
  const isIBR = tech != null && IBR_TECH.has(tech);

  // MADQ-001 — IBR without confirmed EMT model.
  if (isIBR && !gps.emt_model_required) {
    findings.push({
      finding_id: "MADQ-001",
      assessor: "model_adequacy",
      clause: "S5.2.8",
      psmg_ref: "Section 4.3 — RMS and EMT stability model requirements",
      title: "EMT model requirement unconfirmed for IBR technology",
      description: `PSMG Section 4.3 requires EMT models for IBR plant where system strength is a concern. For ${tech} technology, EMT model provision must be explicitly confirmed in the submission.`,
      severity: Severity.MEDIUM,
      evidence_present: false,
      source_document: "gps_baseline",
      source_field: "emt_model_required",
      recommended_action:
        "Explicitly confirm EMT (PSCAD/EMTDC) model provision and scope in the submission per PSMG Section 4.3.",
      rectification_effort: "weeks",
    });
  }

  // MADQ-002 — block diagrams absent (check both GPS and FAT).
  const blockDiagrams =
    (gps.block_diagrams_included ?? false) ||
    (fat?.block_diagrams_provided ?? false);
  if (!blockDiagrams) {
    findings.push({
      finding_id: "MADQ-002",
      assessor: "model_adequacy",
      clause: "S5.2.5.9",
      psmg_ref: "Section 5.2.2 — RMS model block diagrams",
      title: "Transfer function block diagrams absent",
      description:
        "Neither the GPS baseline nor the FAT report references transfer function block diagrams. PSMG Section 5.2.2 makes these mandatory for all RMS models.",
      severity: Severity.HIGH,
      evidence_present: false,
      source_document: "gps_baseline",
      source_field: "block_diagrams_included",
      recommended_action:
        "Provide Laplacian transfer function block diagrams for all controllers per PSMG Section 5.2.2.",
      rectification_effort: "weeks",
    });
  }

  // MADQ-003 — SCR not stated for an IBR project.
  if (isIBR && gps.scr == null) {
    findings.push({
      finding_id: "MADQ-003",
      assessor: "model_adequacy",
      clause: "S5.2.5.15",
      psmg_ref: "Section 3.4 — Exemptions (SCR > 10 threshold)",
      title: "Short circuit ratio not stated — exemption eligibility unclear",
      description:
        "PSMG Section 3.4 exempts plant with SCR > 10 from EMT model requirements. Without SCR, this exemption cannot be assessed.",
      severity: Severity.MEDIUM,
      evidence_present: false,
      source_document: "gps_baseline",
      source_field: "scr",
      recommended_action:
        "State the short circuit ratio at the connection point so EMT exemption eligibility under PSMG Section 3.4 can be assessed.",
      rectification_effort: "days",
    });
  }

  return findings;
}
