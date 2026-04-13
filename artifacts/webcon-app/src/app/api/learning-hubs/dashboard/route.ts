import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  learningHubsTable,
  hubFilesTable,
  creatorEarningsTable,
  agentsTable,
  hubSubscriptionsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const hubId = searchParams.get("hub");

    // Primary: look up by creator session
    let [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.creatorId, session.userId))
      .limit(1);

    // Fallback: look up by token + hub id from the email link
    if (!hub && token && hubId) {
      const [h] = await db
        .select()
        .from(learningHubsTable)
        .where(and(eq(learningHubsTable.id, parseInt(hubId)), eq(learningHubsTable.accessToken, token)))
        .limit(1);
      hub = h;
    }

    if (!hub) {
      return NextResponse.json({ error: "No hub found" }, { status: 404 });
    }

    const [files, earnings, subscriptions, hubAgents] = await Promise.all([
      db.select().from(hubFilesTable).where(eq(hubFilesTable.hubId, hub.id)).orderBy(desc(hubFilesTable.createdAt)),
      db.select().from(creatorEarningsTable).where(eq(creatorEarningsTable.creatorId, session.userId)).orderBy(desc(creatorEarningsTable.createdAt)),
      db.select().from(hubSubscriptionsTable).where(and(eq(hubSubscriptionsTable.hubId, hub.id), eq(hubSubscriptionsTable.active, true))),
      db.select().from(agentsTable).where(eq(agentsTable.learningHubId, hub.id)),
    ]);

    const totalEarningsNgn = earnings.reduce((sum, e) => sum + e.amountNgn, 0);

    return NextResponse.json({
      hub,
      files,
      earnings,
      totalEarningsNgn,
      subscriberCount: subscriptions.length,
      agentCount: hubAgents.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
