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

const DIR = path.join(process.cwd(), "synthetic", "fixtures");
const FILES = ["gps_baseline", "fat_report", "oem_metadata"];

async function main() {
  for (const name of FILES) {
    const src = path.join(DIR, `${name}.txt`);
    const dst = path.join(DIR, `${name}.pdf`);
    const text = await fs.readFile(src, "utf-8");
    await fs.writeFile(dst, text, "utf-8");
    console.log(`wrote ${dst}`);
  }
  console.log("Done. Demo fixtures generated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
