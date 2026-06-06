import { UploadedDocument } from "@/types/documents";
import { Finding, Severity } from "@/types/report";
import { compareSemver, getFAT, getGPS } from "./helpers";

const ASSESSOR = "delta";

/**
 * Delta assessor — compares as-designed GPS baseline values against as-built
 * FAT measurements. Grounded in PSMG Section 6 (model validation) and
 * Section 4.8 (model and plant updates).
 */
export function runDelta(docs: UploadedDocument[]): Finding[] {
  const findings: Finding[] = [];
  const gps = getGPS(docs);
  const fat = getFAT(docs);

  if (
    gps?.transformer_impedance_pu != null &&
    fat?.transformer_impedance_pu != null &&
    gps.transformer_impedance_pu !== 0
  ) {
    const gpsZ = gps.transformer_impedance_pu;
    const fatZ = fat.transformer_impedance_pu;
    // Round to 4 dp before threshold comparison so exact-boundary deltas
    // (e.g. a true 5.00% / 10.00%) are deterministic and floating-point noise
    // cannot tip a value just over the threshold into a higher severity.
    const delta = Math.round((Math.abs(fatZ - gpsZ) / gpsZ) * 1e4) / 1e4;
    const pct = (delta * 100).toFixed(1);

    // 10% / 5% are R1GPT materiality (triage) thresholds, not PSMG-stated
    // limits. The regulatory duty cited is PSMG §4.8 (a changed model must be
    // re-validated); §6.4 is the consequence; §6.2.1 governs model-response
    // accuracy and is cited only in the recommended sensitivity run.
    if (delta > 0.1) {
      findings.push({
        finding_id: "DELTA-001",
        assessor: ASSESSOR,
        clause: "S5.2.8",
        psmg_ref: "Section 4.8 — Model updates require re-validation; Section 6.4 — Non-conformance consequences",
        title:
          "Transformer impedance delta exceeds R1GPT 10% triage threshold — re-validation likely",
        description: `Measured impedance of ${fatZ}pu deviates ${pct}% from design value of ${gpsZ}pu — above R1GPT's 10% materiality threshold (an R1GPT triage threshold, not a PSMG-stated limit). PSMG Section 4.8 requires a changed model to be re-validated before registration; Section 6.4 lets AEMO impose operational constraints until the modelling non-conformance is resolved.`,
        severity: Severity.DMAT_TRIGGERING,
        evidence_present: true,
        source_document: "fat_report",
        source_field: "transformer_impedance_pu",
        recommended_action:
          "Re-validate the model with as-built impedance per PSMG Section 4.8 and submit a sensitivity assessment demonstrating model response stays within the Section 6.2.1 accuracy criteria (within 10% for 95% of samples in the transient window).",
        rectification_effort: "months",
      });
    } else if (delta > 0.05) {
      findings.push({
        finding_id: "DELTA-001",
        assessor: ASSESSOR,
        clause: "S5.2.8",
        psmg_ref: "Section 4.8 — Model updates require re-validation",
        title:
          "Transformer impedance delta exceeds R1GPT 5% triage threshold — sensitivity study required",
        description: `Measured impedance of ${fatZ}pu deviates ${pct}% from design value of ${gpsZ}pu — above R1GPT's 5% materiality threshold but below the 10% threshold (both are R1GPT triage thresholds, not PSMG-stated limits). PSMG Section 4.8 requires re-validation where a parameter change materially affects model accuracy.`,
        severity: Severity.HIGH,
        evidence_present: true,
        source_document: "fat_report",
        source_field: "transformer_impedance_pu",
        recommended_action:
          "Provide an updated PSCAD sensitivity run with as-built impedance confirming model response stays within PSMG Section 6.2.1 accuracy criteria (within 10% for 95% of samples in the transient window).",
        rectification_effort: "weeks",
      });
    }
  }

  // Firmware delta between GPS baseline (OEM firmware at GPS) and FAT firmware.
  // We use the OEM dmat_baseline_version as the GPS-era firmware reference when
  // present on the GPS document; otherwise compare FAT firmware against itself.
  const fatFw = fat?.firmware_version ?? null;
  const gpsFw = (gps as unknown as { firmware_version?: string | null })
    ?.firmware_version ?? null;

  if (fatFw && gpsFw && fatFw !== gpsFw) {
    const bump = compareSemver(fatFw, gpsFw);
    const severity =
      bump === "patch" ? Severity.MEDIUM : Severity.HIGH;
    findings.push({
      finding_id: "DELTA-002",
      assessor: ASSESSOR,
      clause: null,
      psmg_ref: "Section 4.8 — Model and plant updates",
      title:
        "Firmware revision since GPS baseline — model re-validation may apply",
      description:
        "PSMG Section 4.8 requires re-validation when control system changes materially affect model accuracy.",
      severity,
      evidence_present: true,
      source_document: "fat_report",
      source_field: "firmware_version",
      recommended_action:
        "Confirm whether the firmware change between GPS baseline and FAT materially affects model response, and re-validate per PSMG Section 4.8 if so.",
      rectification_effort: severity === Severity.MEDIUM ? "days" : "weeks",
    });
  }

  return findings;
}
