import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditReports } from "@/lib/db/schema";
import { AuditReport } from "@/types/report";

/**
 * DB-backed, workspace-scoped persistence for completed audit reports. The full
 * AuditReport lives in the `payload` JSONB column; project_name / readiness_index
 * / audit_id are mirrored into their own columns for cheap listing and lookups.
 *
 * Like the other data-access modules, these functions perform NO auth checks —
 * route handlers gate access via lib/auth/guard before calling in.
 */

/**
 * UPSERT a report keyed by its audit_id. On first insert the workspace and
 * author are recorded; on a re-run of the same audit_id the payload and mirrored
 * columns are refreshed while workspace_id / created_by are left untouched.
 */
export async function saveReport(params: {
  workspaceId: string;
  projectId: string;
  userId: string;
  report: AuditReport;
}): Promise<void> {
  const { workspaceId, projectId, userId, report } = params;
  await db
    .insert(auditReports)
    .values({
      workspaceId,
      projectId,
      createdBy: userId,
      auditId: report.audit_id,
      projectName: report.project_name,
      readinessIndex: report.readiness_index,
      payload: report,
    })
    .onConflictDoUpdate({
      target: auditReports.auditId,
      set: {
        projectName: report.project_name,
        readinessIndex: report.readiness_index,
        payload: report,
      },
    });
}

/**
 * Fetch a single report by audit_id, scoped to its project so one project can
 * never read another's report. Returns the parsed payload, or null.
 */
export async function getReport(
  projectId: string,
  auditId: string
): Promise<AuditReport | null> {
  const [row] = await db
    .select()
    .from(auditReports)
    .where(
      and(
        eq(auditReports.projectId, projectId),
        eq(auditReports.auditId, auditId)
      )
    )
    .limit(1);
  return row ? (row.payload as AuditReport) : null;
}

/** Most-recently-created report for a project, or null. */
export async function getLatestReport(
  projectId: string
): Promise<AuditReport | null> {
  const [row] = await db
    .select()
    .from(auditReports)
    .where(eq(auditReports.projectId, projectId))
    .orderBy(desc(auditReports.createdAt))
    .limit(1);
  return row ? (row.payload as AuditReport) : null;
}
