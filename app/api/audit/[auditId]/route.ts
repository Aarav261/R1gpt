import { reportStore } from "@/lib/report/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { auditId: string } }
) {
  const report = reportStore.get(params.auditId);
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
