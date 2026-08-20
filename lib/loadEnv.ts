import * as fs from "fs";
import * as path from "path";

/**
 * Minimal .env.local loader for standalone scripts run via `tsx` (e.g.
 * db/seed.ts, drizzle.config.ts) — Next.js itself auto-loads .env.local for
 * `next dev`/`next build`/`next start`, but plain tsx scripts don't, so this
 * fills that gap without adding a dotenv dependency.
 */
export function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}
