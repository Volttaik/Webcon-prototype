import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { hubSubscriptionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rows = await db
      .select({ hubId: hubSubscriptionsTable.hubId })
      .from(hubSubscriptionsTable)
      .where(and(
        eq(hubSubscriptionsTable.userId, session.userId),
        eq(hubSubscriptionsTable.active, true),
      ));

    return NextResponse.json(rows.map(r => r.hubId));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
