import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@workspace/db";
import {
  creditBalancesTable,
  creditTransactionsTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  sendCreditsPurchaseEmail,
  sendPlanUpgradeEmail,
} from "@/app/lib/email";

export const dynamic = "force-dynamic";

const PACKAGE_NAMES: Record<string, { name: string; amountNgn: number }> = {
  trial: { name: "Trial Pack", amountNgn: 100 },
  starter: { name: "Starter Pack", amountNgn: 1000 },
  standard: { name: "Standard Pack", amountNgn: 4500 },
  pro_pack: { name: "Power Pack", amountNgn: 10000 },
  mega: { name: "Mega Pack", amountNgn: 22000 },
  student: { name: "Student Pack", amountNgn: 1200 },
  scholar: { name: "Scholar Pack", amountNgn: 2500 },
  champion: { name: "Champion Pack", amountNgn: 6000 },
};

const PLAN_INFO: Record<string, { name: string; amountNgn: number }> = {
  pro: { name: "Pro Plan", amountNgn: 6000 },
  creator: { name: "Creator Plan", amountNgn: 15000 },
};

const PRO_BONUS_CREDITS = 200;

type PaystackChargeEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    amount?: number;
    metadata?: {
      userId?: number;
      packageId?: string;
      credits?: number;
      planId?: string;
      durationDays?: number;
      type?: string;
    };
  };
};

async function processCreditsPurchase(
  userId: number,
  reference: string,
  packageId: string,
  credits: number
): Promise<void> {
  // Defensive: Paystack metadata is sometimes returned as strings, and PG
  // numeric columns can be returned as strings depending on driver settings.
  // Force everything through Number() to prevent string concatenation.
  userId = Number(userId);
  credits = Number(credits) || 0;
  if (!Number.isFinite(userId) || credits <= 0) {
    console.warn("[paystack-webhook] invalid credits payload", { userId, credits, reference });
    return;
  }

  // Idempotency
  const existing = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.reference, reference))
    .limit(1);
  if (existing.length > 0) {
    console.log(`[paystack-webhook] credits already processed: ${reference}`);
    return;
  }

  const [current] = await db
    .select()
    .from(creditBalancesTable)
    .where(eq(creditBalancesTable.userId, userId))
    .limit(1);

  const newBalance = Number(current?.balance ?? 0) + credits;

  if (current) {
    await db
      .update(creditBalancesTable)
      .set({ balance: newBalance, updatedAt: new Date().toISOString() })
      .where(eq(creditBalancesTable.userId, userId));
  } else {
    await db
      .insert(creditBalancesTable)
      .values({ userId, balance: credits });
  }

  await db.insert(creditTransactionsTable).values({
    userId,
    amount: credits,
    type: "purchase",
    description: `Purchased ${credits} credits (${packageId}) — ref: ${reference}`,
    reference,
  });

  // Send confirmation email
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (user && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const pkg = PACKAGE_NAMES[packageId];
      await sendCreditsPurchaseEmail(
        user.email,
        user.firstName || "there",
        credits,
        newBalance,
        pkg?.name ?? `${credits} Credits`,
        pkg?.amountNgn ?? 0,
        reference
      );
    }
  } catch (emailErr) {
    console.error("[paystack-webhook] credit email failed:", emailErr);
  }
}

async function processPlanUpgrade(
  userId: number,
  reference: string,
  planId: string,
  durationDays: number
): Promise<void> {
  userId = Number(userId);
  durationDays = Number(durationDays) || 30;
  if (!Number.isFinite(userId)) {
    console.warn("[paystack-webhook] invalid plan payload", { userId, reference });
    return;
  }
  // Idempotency
  const existing = await db.execute(
    sql`SELECT subscription_reference FROM users WHERE id = ${userId} LIMIT 1`
  );
  const row = existing.rows?.[0] as
    | { subscription_reference?: string }
    | undefined;
  if (row?.subscription_reference === reference) {
    console.log(`[paystack-webhook] plan already processed: ${reference}`);
    return;
  }

  const expiresAt = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.execute(
    sql`UPDATE users SET subscription_plan = ${planId}, subscription_expires_at = ${expiresAt}, subscription_reference = ${reference} WHERE id = ${userId}`
  );

  let bonusCredits = 0;
  if (planId === "pro") {
    bonusCredits = PRO_BONUS_CREDITS;
    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, userId))
      .limit(1);

    if (balance) {
      await db
        .update(creditBalancesTable)
        .set({
          balance: Number(balance.balance) + PRO_BONUS_CREDITS,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(creditBalancesTable.userId, userId));
    } else {
      await db
        .insert(creditBalancesTable)
        .values({ userId, balance: PRO_BONUS_CREDITS });
    }

    await db.insert(creditTransactionsTable).values({
      userId,
      amount: PRO_BONUS_CREDITS,
      type: "plan_bonus",
      description: `Pro plan bonus: ${PRO_BONUS_CREDITS} free credits`,
      reference,
    });
  }

  // Send confirmation email
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (user && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      const planInfo = PLAN_INFO[planId];
      await sendPlanUpgradeEmail(
        user.email,
        user.firstName || "there",
        planId,
        planInfo?.name ?? planId,
        planInfo?.amountNgn ?? 0,
        durationDays,
        expiresAt,
        bonusCredits,
        reference
      );
    }
  } catch (emailErr) {
    console.error("[paystack-webhook] plan email failed:", emailErr);
  }
}

export async function POST(request: NextRequest) {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      console.error("[paystack-webhook] PAYSTACK_SECRET_KEY not set");
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const expected = crypto
      .createHmac("sha512", paystackKey)
      .update(rawBody)
      .digest("hex");

    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expected, "hex")
      )
    ) {
      console.warn("[paystack-webhook] invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as PaystackChargeEvent;

    // We only care about successful charges
    if (event.event !== "charge.success" || event.data?.status !== "success") {
      return NextResponse.json({ received: true });
    }

    const meta = event.data.metadata;
    const reference = event.data.reference;

    if (!meta?.userId || !reference) {
      console.warn("[paystack-webhook] missing metadata or reference", reference);
      return NextResponse.json({ received: true });
    }

    if (meta.type === "plan_subscription" && meta.planId) {
      await processPlanUpgrade(
        Number(meta.userId),
        reference,
        meta.planId,
        Number(meta.durationDays) || 30
      );
    } else if (meta.credits && meta.packageId) {
      await processCreditsPurchase(
        Number(meta.userId),
        reference,
        meta.packageId,
        Number(meta.credits)
      );
    } else {
      console.warn(
        "[paystack-webhook] unrecognized payment metadata",
        reference
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paystack-webhook] error:", err);
    // Return 200 so Paystack doesn't retry endlessly on bad payloads;
    // we've logged the error for inspection.
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "Paystack webhook endpoint. Set this URL in your Paystack dashboard under Settings → API Keys & Webhooks.",
  });
}
