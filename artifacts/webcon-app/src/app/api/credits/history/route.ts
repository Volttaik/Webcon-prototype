import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { creditTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const txns = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, session.userId))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(50);

    return NextResponse.json(
      txns.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        reference: t.reference ?? null,
        createdAt: t.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
