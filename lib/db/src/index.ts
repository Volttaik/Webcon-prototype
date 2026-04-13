import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const rawConnectionString =
  process.env.SUPABASE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!rawConnectionString) {
  throw new Error(
    "Supabase Postgres connection is not configured. Set SUPABASE_DATABASE_URL or DATABASE_URL before using database-backed routes.",
  );
}

const isLocalDatabase =
  rawConnectionString.includes("localhost") ||
  rawConnectionString.includes("127.0.0.1");

// Strip sslmode from the connection string so our manual ssl config takes effect.
// Newer versions of pg treat sslmode=require as verify-full, which rejects
// Supabase's certificate chain. We handle SSL ourselves instead.
const connectionString = rawConnectionString
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]pgbouncer=[^&]*/g, "")
  .replace(/[?&]supa=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/[?&]$/, "");

const globalForDb = globalThis as typeof globalThis & {
  webconPgPool?: pg.Pool;
};

const pool =
  globalForDb.webconPgPool ??
  new pg.Pool({
    connectionString,
    max: 5,
    ssl: isLocalDatabase
      ? undefined
      : { rejectUnauthorized: false, checkServerIdentity: () => undefined },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.webconPgPool = pool;
}

export const db = drizzle(pool, { schema });

export * from "./schema";
