import type { AuditReport } from "@/types/report";

// Client-side persistence for the "latest audit" a project reflects.
// Two layers (per the design): sessionStorage for instant, navigation-proof UX
// within a tab, and GET /api/audit/latest as the server source of truth.
//
// The latest-pointer is keyed by projectId so two projects open in the same tab
// can never read each other's cached report.
const latestKey = (projectId: string) => `r1gpt:latest:${projectId}`;

/** Persist a completed report: both keyed-by-id and as the project's latest. */
export function saveLatestReport(projectId: string, report: AuditReport): void {
  try {
    const json = JSON.stringify(report);
    sessionStorage.setItem(`r1gpt:${report.audit_id}`, json);
    sessionStorage.setItem(latestKey(projectId), json);
  } catch {
    /* sessionStorage may be unavailable; server store is the fallback */
  }
}

/** Synchronously read the latest report cached for this project, if any. */
export function loadLatestReportSync(projectId: string): AuditReport | null {
  try {
    const raw = sessionStorage.getItem(latestKey(projectId));
    return raw ? (JSON.parse(raw) as AuditReport) : null;
  } catch {
    return null;
  }
}

/** Fetch the latest report from the server store (source of truth across tabs). */
export async function fetchLatestReport(
  projectId: string
): Promise<AuditReport | null> {
  try {
    const res = await fetch(
      `/api/audit/latest?projectId=${encodeURIComponent(projectId)}`
    );
    if (!res.ok) return null;
    return (await res.json()) as AuditReport;
  } catch {
    return null;
  }
}
