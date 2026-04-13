export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const pgModule = await import("pg");
      const pg = pgModule.default;

      const connectionString =
        process.env.SUPABASE_DATABASE_URL ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL;

      if (!connectionString) return;

      const isLocal =
        connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1") ||
        connectionString.includes("helium");

      const client = new pg.Client({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });

      await client.connect();

      const migrations = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_reference TEXT`,
      ];

      for (const sql of migrations) {
        await client.query(sql);
      }

      await client.end();
      console.log("[startup] Subscription schema migration complete");
    } catch (err) {
      console.error("[startup] Migration warning:", (err as Error).message);
    }
  }
}
