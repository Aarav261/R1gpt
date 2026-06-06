import { UploadedDocument } from "@/types/documents";
import { Finding, RectificationEffort, Severity } from "@/types/report";
import { compareSemver, getOEM } from "./helpers";

/**
 * Firmware assessor — compares the current OEM firmware version against the
 * firmware used for the DMAT baseline. Grounded in PSMG Section 4.8 (model and
 * plant updates) and Section 6.4 (non-conformance).
 */
export function runFirmware(docs: UploadedDocument[]): Finding[] {
  const oem = getOEM(docs);
  if (!oem) return [];

  const bump = compareSemver(
    oem.firmware_version,
    oem.dmat_baseline_version
  );
  if (bump === "none") return [];

  let severity: Severity;
  let effort: RectificationEffort;
  let psmg_ref: string;
  let description: string;

  if (bump === "major") {
    severity = Severity.DMAT_TRIGGERING;
    effort = "months";
    psmg_ref =
      "Section 4.8 — Model and plant updates; Section 6.4 — Non-conformance";
    description =
      "PSMG Section 4.8 requires re-validation when firmware changes materially affect model accuracy. Section 6.4 permits AEMO to impose operational constraints until resolved.";
  } else if (bump === "minor") {
    severity = Severity.HIGH;
    effort = "weeks";
    psmg_ref = "Section 4.8 — Model and plant updates";
    description =
      "A minor firmware revision since the DMAT baseline may alter control response. PSMG Section 4.8 requires confirmation that model accuracy is maintained.";
  } else {
    severity = Severity.MEDIUM;
    effort = "days";
    psmg_ref = "Section 4.8 — Model and plant updates";
    description =
      "A patch firmware revision since the DMAT baseline should be assessed for material impact on model accuracy per PSMG Section 4.8.";
  }

  return [
    {
      finding_id: "FW-001",
      assessor: "firmware",
      clause: null,
      psmg_ref,
      title: `Firmware ${bump} version bump since DMAT baseline (${oem.dmat_baseline_version} → ${oem.firmware_version})`,
      description,
      severity,
      evidence_present: true,
      source_document: "oem_metadata",
      source_field: "firmware_version",
      recommended_action:
        "Confirm whether re-validation / DMAT repetition is required under PSMG Section 4.8 and submit updated model if the firmware materially affects response.",
      rectification_effort: effort,
    },
  ];
}
