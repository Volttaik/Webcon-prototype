import { defineConfig } from "drizzle-kit";

const DB_URL =
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!DB_URL) {
  throw new Error("Set SUPABASE_DATABASE_URL or DATABASE_URL before running Drizzle commands.");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: {
    url: DB_URL,
  },
});
