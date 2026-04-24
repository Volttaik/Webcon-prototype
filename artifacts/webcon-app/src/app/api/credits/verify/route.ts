import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { creditBalancesTable, creditTransactionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";
import { sendCreditsPurchaseEmail } from "@/app/lib/email";

const PACKAGE_NAMES: Record<string, { name: string; amountNgn: number }> = {
  trial:    { name: "Trial Pack",    amountNgn: 100 },
  starter:  { name: "Starter Pack",  amountNgn: 1000 },
  standard: { name: "Standard Pack", amountNgn: 4500 },
  pro_pack: { name: "Power Pack",    amountNgn: 10000 },
  mega:     { name: "Mega Pack",     amountNgn: 22000 },
  student:  { name: "Student Pack",  amountNgn: 1200 },
  scholar:  { name: "Scholar Pack",  amountNgn: 2500 },
  champion: { name: "Champion Pack", amountNgn: 6000 },
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
      return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );

    const verifyData = (await verifyRes.json()) as {
      status: boolean;
      data?: {
        status: string;
        metadata?: { userId?: number; packageId?: string; credits?: number };
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

    if (meta.userId !== session.userId) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // Idempotency check
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
      return NextResponse.json({ success: true, credits, balance: balance?.balance ?? 0, alreadyProcessed: true });
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

    const packageId = meta.packageId ?? "unknown";
    await db.insert(creditTransactionsTable).values({
      userId: session.userId,
      amount: credits,
      type: "purchase",
      description: `Purchased ${credits} credits (${packageId}) — ref: ${reference}`,
      reference,
    });

    // Send confirmation email (non-blocking)
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, session.userId))
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
      console.error("[credits/verify] Email send failed:", emailErr);
    }

    return NextResponse.json({ success: true, credits, balance: newBalance });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
