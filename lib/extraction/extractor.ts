import OpenAI from "openai";
import { z } from "zod";
import {
  DocumentType,
  ExtractedModel,
  UploadedDocument,
} from "@/types/documents";
import { parsePdf } from "./parser";
import { promptForDocType } from "./prompts";
import {
  FATReportSchema,
  GPSBaselineSchema,
  OEMMetadataSchema,
} from "./schemas";

function schemaForDocType(
  docType: DocumentType
): z.ZodTypeAny | null {
  switch (docType) {
    case DocumentType.GPS_BASELINE:
      return GPSBaselineSchema;
    case DocumentType.FAT_REPORT:
      return FATReportSchema;
    case DocumentType.OEM_METADATA:
      return OEMMetadataSchema;
    default:
      return null;
  }
}

function stripFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

/**
 * Extract a structured model from a single uploaded document.
 * Returns a fully-typed UploadedDocument. `extracted` is null for document
 * types we only retain as raw text, or when AI/validation fails.
 */
export async function extractDocument(
  openai: OpenAI,
  docType: DocumentType,
  filename: string,
  buffer: Buffer
): Promise<UploadedDocument> {
  const raw_text = await parsePdf(buffer);
  const prompt = promptForDocType(docType);
  const schema = schemaForDocType(docType);

  if (!prompt || !schema) {
    return { doc_type: docType, filename, raw_text, extracted: null };
  }

  let extracted: ExtractedModel | null = null;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: raw_text },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(stripFences(content));
    const result = schema.safeParse(parsed);

    if (result.success) {
      extracted = result.data as ExtractedModel;
    } else {
      console.error(
        `[extractor] Zod validation failed for ${docType} (${filename})`,
        JSON.stringify(result.error.issues),
        "RAW:",
        content
      );
    }
  } catch (err) {
    console.error(`[extractor] extraction error for ${docType}`, err);
  }

  return { doc_type: docType, filename, raw_text, extracted };
}
