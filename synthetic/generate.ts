/**
 * Generates demo "PDF" fixtures from the canonical .txt sources.
 *
 * pdf-parse falls back to a UTF-8 decode when a buffer is not a real PDF, so we
 * simply copy each .txt to a .pdf alongside it. The .pdf copies are gitignored
 * (see .gitignore) — the .txt files are the committed source of truth.
 *
 * Run with: npm run gen:fixtures
 */
import { promises as fs } from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "synthetic", "fixtures");

// Each demo package: a directory and the fixture stems it contains.
const PACKAGES: { dir: string; files: string[] }[] = [
  // Ironbark Solar Farm — failing submission.
  { dir: ROOT, files: ["gps_baseline", "fat_report", "oem_metadata"] },
  // Wattle Creek BESS — fully PSMG-compliant submission.
  {
    dir: path.join(ROOT, "passing"),
    files: ["gps_baseline", "fat_report", "oem_metadata", "pscad_report"],
  },
];

async function main() {
  for (const pkg of PACKAGES) {
    for (const name of pkg.files) {
      const src = path.join(pkg.dir, `${name}.txt`);
      const dst = path.join(pkg.dir, `${name}.pdf`);
      const text = await fs.readFile(src, "utf-8");
      await fs.writeFile(dst, text, "utf-8");
      console.log(`wrote ${dst}`);
    }
  }
  console.log("Done. Demo fixtures generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
