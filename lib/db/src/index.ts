import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const DB_URL = process.env.TURSO_DATABASE_URL ?? "file:/home/runner/workspace/local.db";

const client = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export * from "./schema";
