import { defineConfig } from "drizzle-kit";

const DB_URL = process.env.TURSO_DATABASE_URL ?? "file:/home/runner/workspace/local.db";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "turso",
  dbCredentials: {
    url: DB_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
