import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  learningHubsTable,
  hubFilesTable,
  creditBalancesTable,
  creditTransactionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.id, id))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    const files = await db
      .select()
      .from(hubFilesTable)
      .where(eq(hubFilesTable.hubId, id));

    return NextResponse.json({ ...hub, files });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const { action } = await request.json();

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.id, id))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "Hub not found" }, { status: 404 });
    }

    if (action === "access") {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);

      if (!balance || balance.balance < hub.accessCost) {
        return NextResponse.json(
          { error: `Insufficient credits. Access costs ${hub.accessCost} credits.` },
          { status: 402 }
        );
      }

      await db
        .update(creditBalancesTable)
        .set({ balance: balance.balance - hub.accessCost, updatedAt: new Date().toISOString() })
        .where(eq(creditBalancesTable.userId, session.userId));

      await db.insert(creditTransactionsTable).values({
        userId: session.userId,
        amount: -hub.accessCost,
        type: "hub_access",
        description: `Accessed learning hub: ${hub.title}`,
      });

      return NextResponse.json({ success: true, creditsCharged: hub.accessCost });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
