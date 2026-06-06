import { promises as fs } from "fs";
import path from "path";
import { DocumentType } from "@/types/documents";

export const runtime = "nodejs";

interface FixtureSpec {
  type: DocumentType;
  file: string;
  filename: string;
}

// Two demo packages:
//  - "fail" (default): Ironbark Solar Farm — instructive failing submission.
//  - "pass": Wattle Creek BESS — fully PSMG-compliant submission.
const SETS: Record<string, { project_name: string; dir: string; fixtures: FixtureSpec[] }> = {
  fail: {
    project_name: "Ironbark Solar Farm 400MW",
    dir: "synthetic/fixtures",
    fixtures: [
      { type: DocumentType.GPS_BASELINE, file: "gps_baseline.txt", filename: "ironbark_gps_baseline.pdf" },
      { type: DocumentType.FAT_REPORT, file: "fat_report.txt", filename: "ironbark_fat_report.pdf" },
      { type: DocumentType.OEM_METADATA, file: "oem_metadata.txt", filename: "ironbark_oem_metadata.pdf" },
    ],
  },
  pass: {
    project_name: "Wattle Creek BESS 200MW",
    dir: "synthetic/fixtures/passing",
    fixtures: [
      { type: DocumentType.GPS_BASELINE, file: "gps_baseline.txt", filename: "wattlecreek_gps_baseline.pdf" },
      { type: DocumentType.FAT_REPORT, file: "fat_report.txt", filename: "wattlecreek_fat_report.pdf" },
      { type: DocumentType.OEM_METADATA, file: "oem_metadata.txt", filename: "wattlecreek_oem_metadata.pdf" },
      { type: DocumentType.PSCAD_REPORT, file: "pscad_report.txt", filename: "wattlecreek_pscad_report.pdf" },
    ],
  },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const setKey = url.searchParams.get("set") === "pass" ? "pass" : "fail";
  const set = SETS[setKey];
  const baseDir = path.join(process.cwd(), set.dir);

  const docs = await Promise.all(
    set.fixtures.map(async ({ type, file, filename }) => ({
      doc_type: type,
      filename,
      content: await fs.readFile(path.join(baseDir, file), "utf-8"),
    }))
  );

  return new Response(
    JSON.stringify({ project_name: set.project_name, docs }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
