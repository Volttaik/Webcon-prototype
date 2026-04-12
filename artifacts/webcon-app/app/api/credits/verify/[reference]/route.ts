import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { db } from "@workspace/db";
import { creditBalancesTable, creditTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { reference } = await params;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json(
        { error: "Payment not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${paystackKey}` },
      }
    );

    const data = (await response.json()) as {
      status: boolean;
      data?: {
        status: string;
        metadata?: { userId: number; credits: number; packageId: string };
      };
    };

    if (!data.status || data.data?.status !== "success") {
      return NextResponse.json(
        { error: "Transaction not successful" },
        { status: 400 }
      );
    }

    const { userId, credits } = data.data.metadata ?? {};
    if (!userId || !credits || userId !== session.userId) {
      return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
    }

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    const newBalance = (balance?.balance ?? 0) + credits;
    await db
      .update(creditBalancesTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(creditBalancesTable.userId, session.userId));

    await db.insert(creditTransactionsTable).values({
      userId: session.userId,
      amount: credits,
      type: "purchase",
      description: `Purchased ${credits} credits`,
      reference,
    });

    return NextResponse.json({ success: true, newBalance, creditsAdded: credits });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
