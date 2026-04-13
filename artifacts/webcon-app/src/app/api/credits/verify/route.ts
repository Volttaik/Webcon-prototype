import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { creditBalancesTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

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
      return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
    }

    // Verify with Paystack API
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${paystackKey}` },
      }
    );

    const verifyData = (await verifyRes.json()) as {
      status: boolean;
      data?: {
        status: string;
        metadata?: {
          userId?: number;
          packageId?: string;
          credits?: number;
        };
      };
    };

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    const meta = verifyData.data?.metadata;
    const credits = meta?.credits;

    if (!credits || !meta?.userId) {
      return NextResponse.json({ error: "Invalid payment metadata" }, { status: 400 });
    }

    // Security: only credit the authenticated user
    if (meta.userId !== session.userId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // Idempotency: check if reference was already processed
    const existing = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.reference, reference))
      .limit(1);

    if (existing.length > 0) {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);
      return NextResponse.json({ credits, balance: balance?.balance ?? 0, alreadyProcessed: true });
    }

    // Credit the user
    const [current] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    const newBalance = (current?.balance ?? 0) + credits;

    if (current) {
      await db
        .update(creditBalancesTable)
        .set({ balance: newBalance, updatedAt: new Date().toISOString() })
        .where(eq(creditBalancesTable.userId, session.userId));
    } else {
      await db
        .insert(creditBalancesTable)
        .values({ userId: session.userId, balance: credits });
    }

    await db.insert(creditTransactionsTable).values({
      userId: session.userId,
      amount: credits,
      type: "purchase",
      description: `Purchased ${credits} credits (${meta.packageId ?? "pack"}) — ref: ${reference}`,
      reference,
    });

    return NextResponse.json({ credits, balance: newBalance });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
