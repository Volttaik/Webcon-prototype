import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error(
    "Supabase Postgres connection is not configured. Set SUPABASE_DATABASE_URL or DATABASE_URL before using database-backed routes.",
  );
}

const isLocalDatabase =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1");

const globalForDb = globalThis as typeof globalThis & {
  webconPgPool?: pg.Pool;
};

const pool =
  globalForDb.webconPgPool ??
  new pg.Pool({
    connectionString,
    max: 5,
    ssl: isLocalDatabase ? undefined : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.webconPgPool = pool;
}

export const db = drizzle(pool, { schema });

export * from "./schema";
