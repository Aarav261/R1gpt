import { getReport } from "@/lib/report/store";
import { requireMembership, guardError } from "@/lib/auth/guard";
import { getProjectById } from "@/lib/projects/queries";

export const runtime = "nodejs";
// Reads per-request workspace context + DB; never statically cached.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { auditId: string } }
) {
  const projectId =
    new URL(req.url).searchParams.get("projectId")?.trim() || "";
  if (!projectId) {
    return new Response(
      JSON.stringify({ error: "projectId is required." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const project = await getProjectById(projectId);
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Any member (viewer+) of the parent workspace may read a report.
  const guard = await requireMembership(project.workspaceId);
  if (!guard.ok) return guardError(guard);

  const report = await getReport(projectId, params.auditId);
  if (!report) {
    return new Response(
      JSON.stringify({ error: "Audit report not found." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
