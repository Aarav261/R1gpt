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
    const delta = Math.abs(fatZ - gpsZ) / gpsZ;
    const pct = (delta * 100).toFixed(1);

    if (delta > 0.1) {
      findings.push({
        finding_id: "DELTA-001",
        assessor: ASSESSOR,
        clause: "S5.2.8",
        psmg_ref: "Section 6.3 — Model validation; Section 4.8 — Model updates",
        title:
          "Transformer impedance delta exceeds 10% — DMAT repetition required",
        description: `Measured impedance of ${fatZ}pu deviates ${pct}% from design value of ${gpsZ}pu. PSMG Section 6.4 states AEMO may impose operational constraints until the modelling issue is resolved.`,
        severity: Severity.DMAT_TRIGGERING,
        evidence_present: true,
        source_document: "fat_report",
        source_field: "transformer_impedance_pu",
        recommended_action:
          "Submit sensitivity assessment per PSMG Section 6.3 demonstrating impact of impedance deviation on system strength studies.",
        rectification_effort: "months",
      });
    } else if (delta > 0.05) {
      findings.push({
        finding_id: "DELTA-001",
        assessor: ASSESSOR,
        clause: "S5.2.8",
        psmg_ref: "Section 6.2.1 — Accuracy criteria (10% tolerance)",
        title:
          "Transformer impedance delta exceeds 5% — sensitivity study required",
        description: `Measured impedance of ${fatZ}pu deviates ${pct}% from design value of ${gpsZ}pu, within the DMAT-triggering threshold but above the accuracy review threshold.`,
        severity: Severity.HIGH,
        evidence_present: true,
        source_document: "fat_report",
        source_field: "transformer_impedance_pu",
        recommended_action:
          "Provide updated PSCAD sensitivity run with as-built impedance confirming model accuracy within PSMG Section 6.2.1 tolerances.",
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
