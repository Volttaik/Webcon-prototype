import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  hubSubscriptionsTable,
  learningHubsTable,
  creditBalancesTable,
  creditTransactionsTable,
  creatorEarningsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const SUBSCRIPTION_COST = 50;
const CREATOR_EARNINGS_PER_SUB = 500;

async function getUserPlan(userId: number): Promise<{ plan: string; active: boolean }> {
  try {
    const rows = await db.execute(
      sql`SELECT subscription_plan, subscription_expires_at FROM users WHERE id = ${userId} LIMIT 1`
    );
    const row = rows.rows?.[0] as { subscription_plan?: string; subscription_expires_at?: string } | undefined;
    const plan = row?.subscription_plan ?? "free";
    const expiresAt = row?.subscription_expires_at;
    const active = plan !== "free" && expiresAt ? new Date(expiresAt) > new Date() : false;
    return { plan, active };
  } catch {
    return { plan: "free", active: false };
  }
}

async function triggerPaystackTransfer(creatorId: number, amountNgn: number, reason: string): Promise<string | null> {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, creatorId)).limit(1);
    if (!user?.paystackRecipientCode) return null;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) return null;
    const reference = `SUB-EARN-${Date.now()}-${creatorId}`;
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "balance", amount: amountNgn * 100, recipient: user.paystackRecipientCode, reason, reference }),
    });
    if (res.ok) {
      const data = await res.json() as { data?: { transfer_code?: string } };
      return data.data?.transfer_code || reference;
    }
    return null;
  } catch (err) {
    console.error("Paystack transfer error:", err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { hubId } = await request.json();
    if (!hubId) {
      return NextResponse.json({ error: "hubId is required" }, { status: 400 });
    }

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.id, parseInt(hubId)))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (hub.creatorId === session.userId) {
      return NextResponse.json({ error: "You cannot subscribe to your own hub" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(hubSubscriptionsTable)
      .where(and(
        eq(hubSubscriptionsTable.userId, session.userId),
        eq(hubSubscriptionsTable.hubId, hub.id),
        eq(hubSubscriptionsTable.active, true)
      ))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "You are already subscribed to this hub" }, { status: 409 });
    }

    // Check user plan — Creator plan gets free hub access
    const { plan, active: planActive } = await getUserPlan(session.userId);
    const isCreatorPlan = plan === "creator" && planActive;

    let creditsCharged = 0;
    if (!isCreatorPlan) {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);

      if (!balance || balance.balance < SUBSCRIPTION_COST) {
        return NextResponse.json({
          error: `Insufficient credits. Hub subscription costs ${SUBSCRIPTION_COST} credits. Upgrade to Creator plan for free hub access.`,
        }, { status: 402 });
      }

      await db.update(creditBalancesTable)
        .set({ balance: balance.balance - SUBSCRIPTION_COST, updatedAt: new Date().toISOString() })
        .where(eq(creditBalancesTable.userId, session.userId));

      await db.insert(creditTransactionsTable).values({
        userId: session.userId,
        amount: -SUBSCRIPTION_COST,
        type: "hub_subscription",
        description: `Subscribed to Learning Hub: ${hub.title}`,
      });

      creditsCharged = SUBSCRIPTION_COST;
    }

    await db.insert(hubSubscriptionsTable).values({
      userId: session.userId,
      hubId: hub.id,
      active: true,
    });

    await db.update(learningHubsTable)
      .set({ subscriberCount: (hub.subscriberCount || 0) + 1 })
      .where(eq(learningHubsTable.id, hub.id));

    // Pay creator
    const transferRef = await triggerPaystackTransfer(
      hub.creatorId,
      CREATOR_EARNINGS_PER_SUB,
      `New subscriber for your hub: ${hub.title}`
    );

    await db.insert(creatorEarningsTable).values({
      creatorId: hub.creatorId,
      hubId: hub.id,
      type: "subscription",
      amountNgn: CREATOR_EARNINGS_PER_SUB,
      description: `New subscriber for: ${hub.title}`,
      paystackReference: transferRef || undefined,
      transferStatus: transferRef ? "initiated" : "pending",
    });

    return NextResponse.json({
      success: true,
      subscribed: true,
      creditsCharged,
      freeAccess: isCreatorPlan,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { hubId } = await request.json();

    await db.update(hubSubscriptionsTable)
      .set({ active: false })
      .where(and(
        eq(hubSubscriptionsTable.userId, session.userId),
        eq(hubSubscriptionsTable.hubId, parseInt(hubId))
      ));

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.id, parseInt(hubId)))
      .limit(1);

    if (hub && hub.subscriberCount > 0) {
      await db.update(learningHubsTable)
        .set({ subscriberCount: hub.subscriberCount - 1 })
        .where(eq(learningHubsTable.id, hub.id));
    }

    return NextResponse.json({ success: true, message: "Unsubscribed. Existing agents remain active." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
