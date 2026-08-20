import { defineConfig } from "drizzle-kit";
import { loadEnvLocal } from "./lib/loadEnv";

loadEnvLocal();

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
