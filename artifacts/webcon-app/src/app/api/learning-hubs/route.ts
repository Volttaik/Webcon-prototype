import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  learningHubsTable,
  hubFilesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

function buildCreatorName(firstName: string, lastName: string, email: string): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (full) return full;
  // Fall back to the email local-part so names always look human.
  return (email || "Creator").split("@")[0];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    const baseQuery = db
      .select({
        hub: learningHubsTable,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
      })
      .from(learningHubsTable)
      .leftJoin(usersTable, eq(usersTable.id, learningHubsTable.creatorId))
      .$dynamic();

    const filtered = domain
      ? baseQuery.where(eq(learningHubsTable.domain, domain))
      : baseQuery;

    const rows = await filtered.orderBy(desc(learningHubsTable.createdAt));

    const hubsWithMeta = await Promise.all(
      rows.map(async ({ hub, firstName, lastName, email }) => {
        const files = await db
          .select()
          .from(hubFilesTable)
          .where(eq(hubFilesTable.hubId, hub.id));
        return {
          ...hub,
          fileCount: files.length,
          creatorName: buildCreatorName(firstName ?? "", lastName ?? "", email ?? ""),
        };
      })
    );

    return NextResponse.json(hubsWithMeta);
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
