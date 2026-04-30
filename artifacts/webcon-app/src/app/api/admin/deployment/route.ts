import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "liquid4*";

function present(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function configuredEnv(keys: string[]) {
  return keys.some((key) => present(process.env[key]));
}

function isAuthorized(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return false;

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);

    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

function unauthorized() {
  return NextResponse.json(
    { error: "Admin credentials required" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="EduBridge Admin", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return unauthorized();
  }

  const databaseConfigured = configuredEnv([
    "SUPABASE_DATABASE_URL",
    "DATABASE_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
  ]);

  let databaseReachable = false;
  let databaseError: string | null = null;

  if (databaseConfigured) {
    try {
      const { db } = await import("@workspace/db");
      await db.execute(sql`select 1`);
      databaseReachable = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Database connection failed";
    }
  }

  const checks = [
    {
      key: "database",
      label: "Supabase Postgres",
      configured: databaseConfigured,
      healthy: databaseConfigured && databaseReachable,
      required: true,
      detail: databaseConfigured
        ? databaseReachable
          ? "Database connection is reachable."
          : databaseError || "Database connection could not be verified."
        : "Set SUPABASE_DATABASE_URL or DATABASE_URL in Vercel.",
    },
    {
      key: "siteUrl",
      label: "Public site URL",
      configured: present(process.env.NEXT_PUBLIC_SITE_URL),
      healthy: present(process.env.NEXT_PUBLIC_SITE_URL),
      required: true,
      detail: present(process.env.NEXT_PUBLIC_SITE_URL)
        ? "NEXT_PUBLIC_SITE_URL is configured."
        : "Set NEXT_PUBLIC_SITE_URL to your Vercel production URL.",
    },
    {
      key: "groq",
      label: "AI chat",
      configured: present(process.env.GROQ_API_KEY),
      healthy: present(process.env.GROQ_API_KEY),
      required: true,
      detail: present(process.env.GROQ_API_KEY)
        ? "GROQ_API_KEY is configured."
        : "Set GROQ_API_KEY to enable agent responses.",
    },
    {
      key: "paystack",
      label: "Paystack payments",
      configured: present(process.env.PAYSTACK_SECRET_KEY),
      healthy: present(process.env.PAYSTACK_SECRET_KEY),
      required: true,
      detail: present(process.env.PAYSTACK_SECRET_KEY)
        ? "PAYSTACK_SECRET_KEY is configured."
        : "Set PAYSTACK_SECRET_KEY to enable credit purchases.",
    },
    {
      key: "email",
      label: "Verification email",
      configured: present(process.env.GMAIL_USER) && present(process.env.GMAIL_APP_PASSWORD),
      healthy: present(process.env.GMAIL_USER) && present(process.env.GMAIL_APP_PASSWORD),
      required: true,
      detail: present(process.env.GMAIL_USER) && present(process.env.GMAIL_APP_PASSWORD)
        ? "Gmail sender credentials are configured."
        : "Set GMAIL_USER and GMAIL_APP_PASSWORD to send verification emails.",
    },
    {
      key: "supabaseClient",
      label: "Supabase public client",
      configured: present(process.env.NEXT_PUBLIC_SUPABASE_URL) && present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      healthy: present(process.env.NEXT_PUBLIC_SUPABASE_URL) && present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      required: false,
      detail: present(process.env.NEXT_PUBLIC_SUPABASE_URL) && present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        ? "Public Supabase client keys are configured."
        : "Optional unless client-side Supabase features are enabled.",
    },
  ];

  const requiredChecks = checks.filter((check) => check.required);
  const readyCount = requiredChecks.filter((check) => check.healthy).length;

  return NextResponse.json({
    target: "vercel",
    databaseProvider: "supabase-postgres",
    ready: readyCount === requiredChecks.length,
    readyCount,
    requiredCount: requiredChecks.length,
    checkedAt: new Date().toISOString(),
    checks,
  });
}
