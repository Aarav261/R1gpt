export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({
      status: "ok",
      service: "r1gpt",
      psmg_version: "3.0",
      openai_configured: Boolean(process.env.OPENAI_API_KEY),
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
