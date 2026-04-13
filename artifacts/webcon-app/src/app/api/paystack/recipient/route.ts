import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { bankCode, accountNumber, verifyOnly = false } = await request.json() as {
      bankCode: string;
      accountNumber: string;
      verifyOnly?: boolean;
    };

    if (!bankCode || !accountNumber) {
      return NextResponse.json({ error: "Bank code and account number are required" }, { status: 400 });
    }

    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return NextResponse.json({ error: "Account number must be exactly 10 digits" }, { status: 400 });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json({ error: "Payment processing is not configured yet" }, { status: 503 });
    }

    // Step 1: Resolve account name
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber.trim()}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );
    const resolveData = await resolveRes.json() as { status: boolean; message?: string; data?: { account_name: string } };

    if (!resolveData.status || !resolveData.data?.account_name) {
      return NextResponse.json({
        error: "Could not verify this account. Please check the account number and bank.",
      }, { status: 400 });
    }

    const accountName = resolveData.data.account_name;

    // If only verifying, return here
    if (verifyOnly) {
      return NextResponse.json({ accountName });
    }

    // Step 2: Create transfer recipient
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: accountName,
        account_number: accountNumber.trim(),
        bank_code: bankCode,
        currency: "NGN",
        metadata: { user_id: session.userId, email: user?.email },
      }),
    });

    const recipientData = await recipientRes.json() as { status: boolean; data?: { recipient_code: string } };

    if (!recipientData.status || !recipientData.data?.recipient_code) {
      return NextResponse.json({ error: "Failed to register bank account with Paystack" }, { status: 500 });
    }

    const recipientCode = recipientData.data.recipient_code;

    // Step 3: Save to user profile
    await db.update(usersTable)
      .set({ paystackRecipientCode: recipientCode })
      .where(eq(usersTable.id, session.userId));

    return NextResponse.json({ accountName, recipientCode });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);

    return NextResponse.json({
      hasRecipient: !!user?.paystackRecipientCode,
      recipientCode: user?.paystackRecipientCode ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
