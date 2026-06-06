import type { AuditReport } from "@/types/report";

// Client-side persistence for the "latest audit" the workspace reflects.
// Two layers (per the design): sessionStorage for instant, navigation-proof UX
// within a tab, and GET /api/audit/latest as the server source of truth.
const LATEST_KEY = "r1gpt:latest";

/** Persist a completed report: both keyed-by-id and as the latest pointer. */
export function saveLatestReport(report: AuditReport): void {
  try {
    const json = JSON.stringify(report);
    sessionStorage.setItem(`r1gpt:${report.audit_id}`, json);
    sessionStorage.setItem(LATEST_KEY, json);
  } catch {
    /* sessionStorage may be unavailable; server store is the fallback */
  }
}

/** Synchronously read the latest report cached in this tab, if any. */
export function loadLatestReportSync(): AuditReport | null {
  try {
    const raw = sessionStorage.getItem(LATEST_KEY);
    return raw ? (JSON.parse(raw) as AuditReport) : null;
  } catch {
    return null;
  }
}

/** Fetch the latest report from the server store (source of truth across tabs). */
export async function fetchLatestReport(): Promise<AuditReport | null> {
  try {
    const res = await fetch("/api/audit/latest");
    if (!res.ok) return null;
    return (await res.json()) as AuditReport;
  } catch {
    return null;
  }
}
