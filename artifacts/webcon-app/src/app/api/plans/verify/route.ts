import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { db } from "@workspace/db";
import { usersTable, creditBalancesTable, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { sendPlanUpgradeEmail } from "@/app/lib/email";

const PRO_BONUS_CREDITS = 200;

const PLAN_INFO: Record<string, { name: string; amountNgn: number }> = {
  pro: { name: "Pro Plan", amountNgn: 6000 },
  creator: { name: "Creator Plan", amountNgn: 15000 },
};

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );
    const verifyData = await verifyRes.json() as {
      status: boolean;
      data?: {
        status: string;
        metadata?: {
          userId?: number;
          planId?: string;
          durationDays?: number;
          type?: string;
        };
      };
    };

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    const meta = verifyData.data?.metadata;
    if (!meta?.userId || !meta.planId || meta.type !== "plan_subscription") {
      return NextResponse.json({ error: "Invalid payment metadata" }, { status: 400 });
    }

    if (meta.userId !== session.userId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // Idempotency: check via raw SQL to avoid TS schema issues with new columns
    const existing = await db.execute(
      sql`SELECT subscription_reference, subscription_plan, subscription_expires_at FROM users WHERE id = ${session.userId} LIMIT 1`
    );
    const row = existing.rows?.[0] as { subscription_reference?: string; subscription_plan?: string; subscription_expires_at?: string } | undefined;

    if (row?.subscription_reference === reference) {
      return NextResponse.json({
        alreadyProcessed: true,
        planId: meta.planId,
        plan: row.subscription_plan,
        expiresAt: row.subscription_expires_at,
      });
    }

    const durationDays = meta.durationDays ?? 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Upgrade via raw SQL (columns may not be in drizzle schema cache yet)
    await db.execute(
      sql`UPDATE users SET subscription_plan = ${meta.planId}, subscription_expires_at = ${expiresAt}, subscription_reference = ${reference} WHERE id = ${session.userId}`
    );

    // Grant 200 bonus credits for Pro plan
    let bonusCredits = 0;
    if (meta.planId === "pro") {
      bonusCredits = PRO_BONUS_CREDITS;
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);

      if (balance) {
        await db
          .update(creditBalancesTable)
          .set({ balance: balance.balance + PRO_BONUS_CREDITS, updatedAt: new Date().toISOString() })
          .where(eq(creditBalancesTable.userId, session.userId));
      } else {
        await db.insert(creditBalancesTable).values({
          userId: session.userId,
          balance: PRO_BONUS_CREDITS,
        });
      }

      await db.insert(creditTransactionsTable).values({
        userId: session.userId,
        amount: PRO_BONUS_CREDITS,
        type: "plan_bonus",
        description: `Pro plan bonus: ${PRO_BONUS_CREDITS} free credits`,
        reference,
      });
    }

    // Send confirmation email (non-blocking)
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, session.userId))
        .limit(1);

      if (user && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        const planInfo = PLAN_INFO[meta.planId];
        await sendPlanUpgradeEmail(
          user.email,
          user.firstName || "there",
          meta.planId,
          planInfo?.name ?? meta.planId,
          planInfo?.amountNgn ?? 0,
          durationDays,
          expiresAt,
          bonusCredits,
          reference
        );
      }
    } catch (emailErr) {
      console.error("[plans/verify] Email send failed:", emailErr);
    }

    return NextResponse.json({
      success: true,
      planId: meta.planId,
      expiresAt,
      bonusCredits,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
