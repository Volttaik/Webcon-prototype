import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { workspaceItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function PATCH(
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

    const existing = await db
      .select()
      .from(workspaceItemsTable)
      .where(
        and(
          eq(workspaceItemsTable.id, id),
          eq(workspaceItemsTable.userId, session.userId)
        )
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, content, pinned, starred, subject } = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (pinned !== undefined) updates.pinned = pinned;
    if (starred !== undefined) updates.starred = starred;
    if (subject !== undefined) updates.subject = subject;

    const [item] = await db
      .update(workspaceItemsTable)
      .set(updates)
      .where(eq(workspaceItemsTable.id, id))
      .returning();

    return NextResponse.json({
      ...item,
      agentId: item.agentId ?? null,
      conversationId: item.conversationId ?? null,
      subject: item.subject ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    await db
      .delete(workspaceItemsTable)
      .where(
        and(
          eq(workspaceItemsTable.id, id),
          eq(workspaceItemsTable.userId, session.userId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
