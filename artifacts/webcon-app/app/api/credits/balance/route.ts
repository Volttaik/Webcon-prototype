import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { creditBalancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    return NextResponse.json({
      balance: balance?.balance ?? 0,
      updatedAt: balance?.updatedAt ?? new Date(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
