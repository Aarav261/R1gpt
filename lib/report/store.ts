import { AuditReport } from "@/types/report";

// Module-level store. Persists for the lifetime of the server process so the
// report page can retrieve a completed audit by id. For MVP this is sufficient
// (no database). On Vercel, warm lambdas retain this between invocations.
const globalForStore = globalThis as unknown as {
  __r1gpt_reports?: Map<string, AuditReport>;
};

export const reportStore: Map<string, AuditReport> =
  globalForStore.__r1gpt_reports ?? new Map<string, AuditReport>();

if (!globalForStore.__r1gpt_reports) {
  globalForStore.__r1gpt_reports = reportStore;
}
