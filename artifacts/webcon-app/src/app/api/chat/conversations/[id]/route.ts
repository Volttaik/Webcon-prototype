import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { conversations, messages, agentsTable } from "@workspace/db";
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

    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.userId)
        )
      )
      .limit(1);

    if (!conv) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const [agent] = conv.agentId
      ? await db
          .select()
          .from(agentsTable)
          .where(eq(agentsTable.id, conv.agentId))
          .limit(1)
      : [null];

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    return NextResponse.json({
      id: conv.id,
      userId: conv.userId,
      agentId: conv.agentId,
      agentName: agent?.name ?? null,
      agentSubject: agent?.subject ?? null,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        thinkMs: m.thinkMs ?? null,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

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
    const { title } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const [updated] = await db
      .update(conversations)
      .set({ title: title.trim() })
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.userId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ id: updated.id, title: updated.title });
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
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.userId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
