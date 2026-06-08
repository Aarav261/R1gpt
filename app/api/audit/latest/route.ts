import { getLatestReport } from "@/lib/report/store";
import { requireMembership, guardError } from "@/lib/auth/guard";
import { getProjectById } from "@/lib/projects/queries";

export const runtime = "nodejs";
// Reads per-request workspace context + DB; never statically cached.
export const dynamic = "force-dynamic";

// Most-recently-completed audit for a project, used by the dashboard to hydrate
// the live report on load. A static segment, so it takes precedence over the
// sibling [auditId] dynamic route for the literal path /api/audit/latest.
export async function GET(req: Request) {
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

  // Any member (viewer+) of the parent workspace may read the latest report.
  const guard = await requireMembership(project.workspaceId);
  if (!guard.ok) return guardError(guard);

  const report = await getLatestReport(projectId);
  if (!report) {
    return new Response(
      JSON.stringify({ error: "No audit has been run yet." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
