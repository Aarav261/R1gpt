import {
  DocumentType,
  FATReport,
  GPSBaseline,
  OEMMetadata,
  UploadedDocument,
} from "@/types/documents";
import { Severity } from "@/types/report";

export function findDoc(
  docs: UploadedDocument[],
  type: DocumentType
): UploadedDocument | undefined {
  return docs.find((d) => d.doc_type === type);
}

export function getGPS(docs: UploadedDocument[]): GPSBaseline | null {
  const doc = findDoc(docs, DocumentType.GPS_BASELINE);
  return (doc?.extracted as GPSBaseline) ?? null;
}

export function getFAT(docs: UploadedDocument[]): FATReport | null {
  const doc = findDoc(docs, DocumentType.FAT_REPORT);
  return (doc?.extracted as FATReport) ?? null;
}

export function getOEM(docs: UploadedDocument[]): OEMMetadata | null {
  const doc = findDoc(docs, DocumentType.OEM_METADATA);
  return (doc?.extracted as OEMMetadata) ?? null;
}

export const SEVERITY_ORDER: Record<Severity, number> = {
  [Severity.DMAT_TRIGGERING]: 3,
  [Severity.HIGH]: 2,
  [Severity.MEDIUM]: 1,
  [Severity.LOW]: 0,
};

/** Parse a "v2.1.0" / "2.1.0" style version into [major, minor, patch]. */
export function parseSemver(
  v: string | null | undefined
): [number, number, number] | null {
  if (!v) return null;
  const m = v.trim().match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

export type SemverBump = "major" | "minor" | "patch" | "none";

export function compareSemver(
  current: string | null,
  baseline: string | null
): SemverBump {
  const c = parseSemver(current);
  const b = parseSemver(baseline);
  if (!c || !b) return "none";
  if (c[0] !== b[0]) return "major";
  if (c[1] !== b[1]) return "minor";
  if (c[2] !== b[2]) return "patch";
  return "none";
}
