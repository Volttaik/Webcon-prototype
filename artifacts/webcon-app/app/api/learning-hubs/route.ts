import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  learningHubsTable,
  hubFilesTable,
  creditBalancesTable,
  creditTransactionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    let query = db.select().from(learningHubsTable).$dynamic();
    if (domain) {
      query = query.where(eq(learningHubsTable.domain, domain));
    }

    const hubs = await query.orderBy(desc(learningHubsTable.createdAt));

    const hubsWithFiles = await Promise.all(
      hubs.map(async (hub) => {
        const files = await db
          .select()
          .from(hubFilesTable)
          .where(eq(hubFilesTable.hubId, hub.id));
        return { ...hub, fileCount: files.length };
      })
    );

    return NextResponse.json(hubsWithFiles);
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

    const { title, description, domain, accessCost, agentCost, isPublic } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const [hub] = await db
      .insert(learningHubsTable)
      .values({
        creatorId: session.userId,
        title,
        description: description || null,
        domain: domain || "general",
        accessCost: accessCost ?? 200,
        agentCost: agentCost ?? 700,
        isPublic: isPublic ?? true,
      })
      .returning();

    return NextResponse.json(hub, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
