import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PLANS: Record<string, { name: string; amountNgn: number; durationDays: number }> = {
  pro: { name: "Pro Plan", amountNgn: 6000, durationDays: 30 },
  creator: { name: "Creator Plan", amountNgn: 15000, durationDays: 30 },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { planId } = await request.json() as { planId: string };
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
    }

    const reference = `PLAN-${planId.toUpperCase()}-${Date.now()}-${session.userId}`;

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.amountNgn * 100,
        reference,
        callback_url: `${new URL(request.url).origin}/billing?payment=success`,
        metadata: {
          userId: session.userId,
          planId,
          durationDays: plan.durationDays,
          type: "plan_subscription",
        },
      }),
    });

    const data = await response.json() as {
      status: boolean;
      data?: { authorization_url: string; reference: string };
    };

    if (!data.status || !data.data) {
      return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      plan,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
