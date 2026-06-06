import { UploadedDocument } from "@/types/documents";
import { Finding, Severity } from "@/types/report";
import { getGPS } from "./helpers";

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * NSP assessor — flags a GPS baseline that is more than 12 months old, where
 * network conditions and system strength may have materially changed.
 * Grounded in PSMG Section 4.8 (model and plant updates).
 */
export function runNSP(docs: UploadedDocument[]): Finding[] {
  const gps = getGPS(docs);
  if (!gps?.agreed_gps_date) return [];

  const agreed = new Date(gps.agreed_gps_date);
  if (Number.isNaN(agreed.getTime())) return [];

  const ageMs = Date.now() - agreed.getTime();
  if (ageMs <= TWELVE_MONTHS_MS) return [];

  const ageMonths = Math.round(ageMs / (30 * 24 * 60 * 60 * 1000));

  return [
    {
      finding_id: "NSP-001",
      assessor: "nsp",
      clause: null,
      psmg_ref: "Section 4.8 — Model and plant updates",
      title: "GPS baseline over 12 months old — network conditions likely changed",
      description: `The GPS was agreed ${ageMonths} months ago (${gps.agreed_gps_date}). Network augmentations or newly committed IBRs since the GPS agreed date may have materially altered system strength at the connection point, invalidating assumptions in the submitted models.`,
      severity: Severity.HIGH,
      evidence_present: true,
      source_document: "gps_baseline",
      source_field: "agreed_gps_date",
      recommended_action:
        "Request updated fault level data from NSP and confirm no material network changes have occurred since GPS was agreed.",
      rectification_effort: "weeks",
    },
  ];
}
