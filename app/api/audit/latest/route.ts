import { getLatestReport } from "@/lib/report/store";

export const runtime = "nodejs";
// Reads mutable module state, so it must never be statically cached.
export const dynamic = "force-dynamic";

// Most-recently-completed audit, used by the workspace dashboard to hydrate the
// live report on load. A static segment, so it takes precedence over the
// sibling [auditId] dynamic route for the literal path /api/audit/latest.
export async function GET() {
  const report = getLatestReport();
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
