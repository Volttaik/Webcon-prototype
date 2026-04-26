import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  creditBalancesTable,
  creditTransactionsTable,
  creditTransfersTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const MONTHLY_TRANSFER_LIMIT = 500;

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

async function monthlyUsed(userId: number): Promise<number> {
  const since = startOfMonthIso();
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${creditTransfersTable.amount}), 0)` })
    .from(creditTransfersTable)
    .where(and(
      eq(creditTransfersTable.senderId, userId),
      gte(creditTransfersTable.createdAt, since),
    ));
  return Number(row?.total ?? 0);
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const used = await monthlyUsed(session.userId);

    const sent = await db
      .select()
      .from(creditTransfersTable)
      .where(eq(creditTransfersTable.senderId, session.userId))
      .orderBy(desc(creditTransfersTable.createdAt))
      .limit(20);

    const received = await db
      .select()
      .from(creditTransfersTable)
      .where(eq(creditTransfersTable.recipientId, session.userId))
      .orderBy(desc(creditTransfersTable.createdAt))
      .limit(20);

    return NextResponse.json({
      monthlyLimit: MONTHLY_TRANSFER_LIMIT,
      monthlyUsed: used,
      monthlyRemaining: Math.max(0, MONTHLY_TRANSFER_LIMIT - used),
      sent,
      received,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const recipientEmailRaw: string = String(body?.recipientEmail || "").trim().toLowerCase();
    const amount: number = Math.floor(Number(body?.amount));
    const note: string | null = body?.note ? String(body.note).slice(0, 200) : null;

    if (!recipientEmailRaw) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmailRaw)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    if (amount > MONTHLY_TRANSFER_LIMIT) {
      return NextResponse.json({ error: `Maximum ${MONTHLY_TRANSFER_LIMIT} credits per month` }, { status: 400 });
    }

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    if (sender.email.toLowerCase() === recipientEmailRaw) {
      return NextResponse.json({ error: "You cannot transfer credits to yourself" }, { status: 400 });
    }

    const [recipient] = await db
      .select()
      .from(usersTable)
      .where(sql`LOWER(${usersTable.email}) = ${recipientEmailRaw}`)
      .limit(1);

    if (!recipient) {
      return NextResponse.json({ error: "No EduBridge user found with that email" }, { status: 404 });
    }

    const used = await monthlyUsed(session.userId);
    if (used + amount > MONTHLY_TRANSFER_LIMIT) {
      const remaining = Math.max(0, MONTHLY_TRANSFER_LIMIT - used);
      return NextResponse.json({
        error: `Monthly transfer limit exceeded. You have ${remaining} credit(s) remaining this month.`,
        monthlyUsed: used,
        monthlyRemaining: remaining,
      }, { status: 400 });
    }

    const [senderBalance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    if (!senderBalance || senderBalance.balance < amount) {
      return NextResponse.json({
        error: `Insufficient credits. You have ${senderBalance?.balance ?? 0}.`,
      }, { status: 402 });
    }

    // Deduct from sender
    await db
      .update(creditBalancesTable)
      .set({ balance: senderBalance.balance - amount, updatedAt: new Date().toISOString() })
      .where(eq(creditBalancesTable.userId, session.userId));

    // Credit recipient (upsert)
    const [recipientBalance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, recipient.id))
      .limit(1);

    if (recipientBalance) {
      await db
        .update(creditBalancesTable)
        .set({ balance: recipientBalance.balance + amount, updatedAt: new Date().toISOString() })
        .where(eq(creditBalancesTable.userId, recipient.id));
    } else {
      await db.insert(creditBalancesTable).values({
        userId: recipient.id,
        balance: amount,
        updatedAt: new Date().toISOString(),
      });
    }

    const senderLabel = `${sender.firstName} ${sender.lastName}`.trim() || sender.email;
    const recipientLabel = `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email;

    await db.insert(creditTransactionsTable).values({
      userId: session.userId,
      amount: -amount,
      type: "transfer_out",
      description: `Transferred to ${recipientLabel}`,
    });

    await db.insert(creditTransactionsTable).values({
      userId: recipient.id,
      amount,
      type: "transfer_in",
      description: `Received from ${senderLabel}`,
    });

    const [transfer] = await db
      .insert(creditTransfersTable)
      .values({
        senderId: session.userId,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        amount,
        note,
      })
      .returning();

    const newUsed = used + amount;

    return NextResponse.json({
      success: true,
      transfer,
      monthlyLimit: MONTHLY_TRANSFER_LIMIT,
      monthlyUsed: newUsed,
      monthlyRemaining: Math.max(0, MONTHLY_TRANSFER_LIMIT - newUsed),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
