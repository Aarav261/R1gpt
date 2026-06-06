import { promises as fs } from "fs";
import path from "path";
import { DocumentType } from "@/types/documents";

export const runtime = "nodejs";

// Maps demo fixture files to the DocumentType field the audit route expects.
const FIXTURES: { type: DocumentType; file: string; filename: string }[] = [
  {
    type: DocumentType.GPS_BASELINE,
    file: "gps_baseline.txt",
    filename: "ironbark_gps_baseline.pdf",
  },
  {
    type: DocumentType.FAT_REPORT,
    file: "fat_report.txt",
    filename: "ironbark_fat_report.pdf",
  },
  {
    type: DocumentType.OEM_METADATA,
    file: "oem_metadata.txt",
    filename: "ironbark_oem_metadata.pdf",
  },
];

export async function GET() {
  const dir = path.join(process.cwd(), "synthetic", "fixtures");
  const docs = await Promise.all(
    FIXTURES.map(async ({ type, file, filename }) => ({
      doc_type: type,
      filename,
      content: await fs.readFile(path.join(dir, file), "utf-8"),
    }))
  );

  return new Response(
    JSON.stringify({ project_name: "Ironbark Solar Farm 400MW", docs }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
