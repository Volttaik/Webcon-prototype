import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { workspaceItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const items = await db
      .select()
      .from(workspaceItemsTable)
      .where(eq(workspaceItemsTable.userId, session.userId));

    return NextResponse.json(
      items.map((i) => ({
        ...i,
        agentId: i.agentId ?? null,
        conversationId: i.conversationId ?? null,
        subject: i.subject ?? null,
      }))
    );
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

    const {
      type,
      title,
      content = "",
      agentId,
      conversationId,
      subject,
      pinned = false,
      starred = false,
    } = await request.json();

    if (!type || !title) {
      return NextResponse.json(
        { error: "type and title are required" },
        { status: 400 }
      );
    }

    const [item] = await db
      .insert(workspaceItemsTable)
      .values({
        userId: session.userId,
        type,
        title,
        content,
        agentId: agentId ?? undefined,
        conversationId: conversationId ?? undefined,
        subject: subject ?? undefined,
        pinned,
        starred,
      })
      .returning();

    return NextResponse.json(
      {
        ...item,
        agentId: item.agentId ?? null,
        conversationId: item.conversationId ?? null,
        subject: item.subject ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
