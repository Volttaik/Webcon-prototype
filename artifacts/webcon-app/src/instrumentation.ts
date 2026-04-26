export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const pgModule = await import("pg");
      const pg = pgModule.default;

      const rawConnectionString =
        process.env.SUPABASE_DATABASE_URL ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.POSTGRES_PRISMA_URL;

      if (!rawConnectionString) return;

      const isLocal =
        rawConnectionString.includes("localhost") ||
        rawConnectionString.includes("127.0.0.1") ||
        rawConnectionString.includes("helium");

      // Mirror lib/db: strip sslmode/pgbouncer/supa params so our manual ssl
      // config takes effect. Newer pg treats sslmode=require as verify-full,
      // which rejects Supabase's self-signed cert chain.
      const connectionString = rawConnectionString
        .replace(/[?&]sslmode=[^&]*/g, "")
        .replace(/[?&]pgbouncer=[^&]*/g, "")
        .replace(/[?&]supa=[^&]*/g, "")
        .replace(/\?&/, "?")
        .replace(/[?&]$/, "");

      const client = new pg.Client({
        connectionString,
        ssl: isLocal
          ? false
          : { rejectUnauthorized: false, checkServerIdentity: () => undefined },
      });

      await client.connect();

      const migrations = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free'`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TEXT`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_reference TEXT`,
        `CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          icon TEXT,
          href TEXT,
          meta TEXT,
          read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TEXT NOT NULL DEFAULT NOW()::TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE`,
        `CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          created_at TEXT NOT NULL DEFAULT NOW()::TEXT,
          CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`,
        `CREATE TABLE IF NOT EXISTS credit_transfers (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_email TEXT NOT NULL,
          amount INTEGER NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT NOW()::TEXT
        )`,
        `CREATE INDEX IF NOT EXISTS idx_credit_transfers_sender_created ON credit_transfers(sender_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_credit_transfers_recipient_created ON credit_transfers(recipient_id, created_at DESC)`,
      ];

      let ok = 0;
      let failed = 0;
      for (const sql of migrations) {
        try {
          await client.query(sql);
          ok += 1;
        } catch (stepErr) {
          failed += 1;
          console.warn("[startup] Migration step skipped:", (stepErr as Error).message);
        }
      }

      await client.end();
      console.log(`[startup] Schema migrations complete (ok: ${ok}, skipped: ${failed})`);
    } catch (err) {
      console.error("[startup] Migration warning:", (err as Error).message);
    }
  }
}
