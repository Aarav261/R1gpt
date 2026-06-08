/**
 * Testing-stage data reset.
 *
 * Wipes all application data so you can re-run signup/workspace/invite flows
 * from a clean slate:
 *   • Neon  — truncates every domain table (users, workspaces, memberships,
 *             invites, files, audit_reports) with RESTART IDENTITY CASCADE.
 *   • Blob  — deletes uploaded file blobs from the Vercel Blob store.
 *
 * SAFETY: this is destructive and irreversible. It is a DRY RUN by default —
 * it prints what it would delete and exits. Pass --yes to actually delete.
 *
 * Usage:
 *   npm run db:reset                 # dry run — show counts, delete nothing
 *   npm run db:reset -- --yes        # wipe Neon tables AND Blob
 *   npm run db:reset -- --yes --db-only      # only Neon
 *   npm run db:reset -- --yes --blob-only    # only Blob
 *   npm run db:reset -- --yes --prefix workspaces/   # limit Blob deletes to a prefix
 *
 * Reads DATABASE_URL and BLOB_READ_WRITE_TOKEN from .env.local.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { list, del } from "@vercel/blob";

// Domain tables in FK-safe order (children first). CASCADE covers the rest, but
// an explicit order keeps the intent obvious.
const TABLES = [
  "audit_reports",
  "files",
  "invites",
  "memberships",
  "workspaces",
  "users",
] as const;

type Args = {
  confirm: boolean;
  dbOnly: boolean;
  blobOnly: boolean;
  prefix?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { confirm: false, dbOnly: false, blobOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--yes" || a === "-y") args.confirm = true;
    else if (a === "--db-only") args.dbOnly = true;
    else if (a === "--blob-only") args.blobOnly = true;
    else if (a === "--prefix") args.prefix = argv[++i];
  }
  return args;
}

async function resetDatabase(confirm: boolean): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("  ✗ DATABASE_URL is not set in .env.local — skipping Neon.");
    return;
  }
  const sql = neon(url);

  // Report current row counts (tables may not exist if migrations never ran).
  let total = 0;
  for (const table of TABLES) {
    try {
      const rows = (await sql.query(
        `SELECT count(*)::int AS count FROM "${table}"`,
      )) as { count: number }[];
      const count = rows[0]?.count ?? 0;
      total += count;
      console.log(`  • ${table.padEnd(14)} ${count} row(s)`);
    } catch {
      console.log(`  • ${table.padEnd(14)} (table missing — skipped)`);
    }
  }

  if (!confirm) {
    console.log(`  → DRY RUN: would truncate ${total} row(s). Re-run with --yes.`);
    return;
  }

  // One statement so CASCADE + RESTART IDENTITY apply atomically.
  await sql.query(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
  console.log(`  ✓ Neon: truncated ${TABLES.length} tables (${total} row(s)).`);
}

async function resetBlob(confirm: boolean, prefix?: string): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error(
      "  ✗ BLOB_READ_WRITE_TOKEN is not set in .env.local — skipping Blob.",
    );
    return;
  }

  // Page through the whole store collecting blob URLs.
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ token, cursor, limit: 1000, prefix });
    for (const b of page.blobs) urls.push(b.url);
    cursor = page.cursor;
  } while (cursor);

  console.log(
    `  • ${urls.length} blob(s)${prefix ? ` under "${prefix}"` : " in store"}`,
  );

  if (!confirm) {
    console.log(`  → DRY RUN: would delete ${urls.length} blob(s). Re-run with --yes.`);
    return;
  }
  if (urls.length === 0) {
    console.log("  ✓ Blob: nothing to delete.");
    return;
  }

  // del() accepts up to 1000 urls per call; chunk to stay within the limit.
  for (let i = 0; i < urls.length; i += 1000) {
    await del(urls.slice(i, i + 1000), { token });
  }
  console.log(`  ✓ Blob: deleted ${urls.length} blob(s).`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    args.confirm
      ? "⚠  RESET (destructive) — deleting application data\n"
      : "🔎 RESET dry run — nothing will be deleted (pass --yes to apply)\n",
  );

  if (!args.blobOnly) {
    console.log("Neon database:");
    await resetDatabase(args.confirm);
    console.log("");
  }
  if (!args.dbOnly) {
    console.log("Vercel Blob:");
    await resetBlob(args.confirm, args.prefix);
    console.log("");
  }

  console.log(args.confirm ? "Done." : "Dry run complete.");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
