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
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const SUBSCRIPTION_COST = 50;
const CREATOR_EARNINGS_PER_SUB = 500;

async function triggerPaystackTransfer(creatorId: number, amountNgn: number, reason: string): Promise<string | null> {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, creatorId))
      .limit(1);

    if (!user?.paystackRecipientCode) return null;

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) return null;

    const reference = `SUB-EARN-${Date.now()}-${creatorId}`;
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountNgn * 100,
        recipient: user.paystackRecipientCode,
        reason,
        reference,
      }),
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

    // Get hub
    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.id, parseInt(hubId)))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    // Prevent subscribing to own hub
    if (hub.creatorId === session.userId) {
      return NextResponse.json({ error: "You cannot subscribe to your own hub" }, { status: 400 });
    }

    // Check existing subscription
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

    // Check credits
    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    if (!balance || balance.balance < SUBSCRIPTION_COST) {
      return NextResponse.json({
        error: `Insufficient credits. Subscribing costs ${SUBSCRIPTION_COST} credits.`,
      }, { status: 402 });
    }

    // Deduct credits
    await db.update(creditBalancesTable)
      .set({ balance: balance.balance - SUBSCRIPTION_COST, updatedAt: new Date().toISOString() })
      .where(eq(creditBalancesTable.userId, session.userId));

    await db.insert(creditTransactionsTable).values({
      userId: session.userId,
      amount: -SUBSCRIPTION_COST,
      type: "hub_subscription",
      description: `Subscribed to Learning Hub: ${hub.title}`,
    });

    // Create subscription
    await db.insert(hubSubscriptionsTable).values({
      userId: session.userId,
      hubId: hub.id,
      active: true,
    });

    // Update subscriber count
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
      creditsCharged: SUBSCRIPTION_COST,
      newBalance: balance.balance - SUBSCRIPTION_COST,
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

    // Decrement count
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

    return NextResponse.json({ success: true, message: "Unsubscribed. Existing agents remain active but won't receive new updates." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
