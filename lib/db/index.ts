import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Drizzle client over Neon's serverless HTTP driver.
 *
 * A globalThis singleton guard (mirroring lib/report/store.ts) keeps a single
 * client instance across hot reloads in development, avoiding a new connection
 * per module reload.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.local.example).",
  );
}

const globalForDb = globalThis as unknown as {
  __r1gpt_db?: ReturnType<typeof drizzle<typeof schema>>;
};

export const db =
  globalForDb.__r1gpt_db ??
  drizzle(neon(connectionString), { schema });

if (!globalForDb.__r1gpt_db) {
  globalForDb.__r1gpt_db = db;
}

export { schema };
