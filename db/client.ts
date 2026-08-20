import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { loadEnvLocal } from "../lib/loadEnv";

// Next.js auto-loads .env.local for `next dev`/`build`/`start`, but this
// module is also imported directly by standalone tsx scripts (db/seed.ts)
// which don't — calling this here (rather than relying on import order in
// the caller) makes it work either way. No-op if .env.local is absent or
// DATABASE_URL is already set some other way (e.g. Vercel env vars).
loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example) — this should be the " +
      "Supabase connection string from Project → Connect → ORM → Drizzle."
  );
}

// `prepare: false` is required for Supabase's shared transaction-mode pooler
// (port 6543) — that pooler (pgbouncer) doesn't support prepared statements.
// If you switch to the direct connection (port 5432) later, this can be removed.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
