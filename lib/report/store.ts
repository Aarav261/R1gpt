import { AuditReport } from "@/types/report";

// Module-level store. Persists for the lifetime of the server process so the
// report page can retrieve a completed audit by id. For MVP this is sufficient
// (no database). On Vercel, warm lambdas retain this between invocations.
const globalForStore = globalThis as unknown as {
  __r1gpt_reports?: Map<string, AuditReport>;
  __r1gpt_latest_id?: string;
};

export const reportStore: Map<string, AuditReport> =
  globalForStore.__r1gpt_reports ?? new Map<string, AuditReport>();

if (!globalForStore.__r1gpt_reports) {
  globalForStore.__r1gpt_reports = reportStore;
}

/**
 * Persist a report and mark it as the most recently completed audit. The
 * workspace dashboard reads this so a fresh upload is reflected on next visit
 * even when the client-side sessionStorage copy is unavailable (e.g. new tab).
 */
export function setLatestReport(report: AuditReport): void {
  reportStore.set(report.audit_id, report);
  globalForStore.__r1gpt_latest_id = report.audit_id;
}

/** The most recently completed audit this process lifetime, or null. */
export function getLatestReport(): AuditReport | null {
  const id = globalForStore.__r1gpt_latest_id;
  return id ? reportStore.get(id) ?? null : null;
}
