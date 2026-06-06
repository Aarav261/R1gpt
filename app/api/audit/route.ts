import OpenAI from "openai";
import { DocumentType, UploadedDocument } from "@/types/documents";
import { extractDocument } from "@/lib/extraction/extractor";
import { buildAuditReport } from "@/lib/report/builder";
import { setLatestReport } from "@/lib/report/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const DOC_TYPES = Object.values(DocumentType);

function sse(event: string, data: unknown): string {
  return JSON.stringify({ event, data }) + "\n";
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const openai = new OpenAI({ apiKey });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: "Expected multipart/form-data." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const project_name =
    (form.get("project_name") as string | null)?.trim() || "Untitled Project";

  // Collect uploaded files keyed by DocumentType value.
  const fileEntries: { type: DocumentType; file: File }[] = [];
  for (const type of DOC_TYPES) {
    const entry = form.get(type);
    if (entry && entry instanceof File && entry.size > 0) {
      fileEntries.push({ type, file: entry });
    }
  }

  if (fileEntries.length === 0) {
    return new Response(
      JSON.stringify({ error: "No documents supplied." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sse(event, data)));

      try {
        // 1 — Extraction (parallel across documents).
        const docs: UploadedDocument[] = await Promise.all(
          fileEntries.map(async ({ type, file }) => {
            const buffer = Buffer.from(await file.arrayBuffer());
            return extractDocument(openai, type, file.name, buffer);
          })
        );
        send("extraction_complete", { docCount: docs.length });

        // 2–4 — Assessment, scoring, RFI generation.
        const report = await buildAuditReport(openai, project_name, docs, {
          onAssessmentComplete: (findingCount) =>
            send("assessment_complete", { findingCount }),
          onScoringComplete: (readiness) =>
            send("scoring_complete", { readiness }),
        });

        setLatestReport(report);

        send("report_complete", report);
      } catch (err) {
        console.error("[api/audit] pipeline error", err);
        send("error", {
          message: err instanceof Error ? err.message : "Audit failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
