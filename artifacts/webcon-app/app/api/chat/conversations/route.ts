import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { conversations, messages, agentsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const agentIdParam = url.searchParams.get("agentId");
    const agentId = agentIdParam ? parseInt(agentIdParam) : undefined;

    const whereClause = agentId
      ? and(
          eq(conversations.userId, session.userId),
          eq(conversations.agentId, agentId)
        )
      : eq(conversations.userId, session.userId);

    const convs = await db
      .select()
      .from(conversations)
      .where(whereClause)
      .orderBy(desc(conversations.updatedAt));

    const withCounts = await Promise.all(
      convs.map(async (c) => {
        const [agent] = c.agentId
          ? await db
              .select()
              .from(agentsTable)
              .where(eq(agentsTable.id, c.agentId))
              .limit(1)
          : [null];
        const [msgCount] = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.conversationId, c.id));
        const lastMsgs = await db
          .select({ content: messages.content, role: messages.role })
          .from(messages)
          .where(and(eq(messages.conversationId, c.id), eq(messages.role, 'assistant')))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        const preview = lastMsgs[0]?.content
          ? lastMsgs[0].content.replace(/```[\s\S]*?```/g, '[code]').replace(/\*\*/g, '').trim().slice(0, 120)
          : null;
        return {
          id: c.id,
          userId: c.userId,
          agentId: c.agentId,
          agentName: agent?.name ?? null,
          agentSubject: agent?.subject ?? null,
          title: c.title,
          messageCount: Number(msgCount?.count ?? 0),
          preview,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );

    return NextResponse.json(withCounts);
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

    const { agentId, title } = await request.json();
    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(
        and(
          eq(agentsTable.id, agentId),
          eq(agentsTable.userId, session.userId)
        )
      )
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const convTitle =
      title || `${agent.name} — ${new Date().toLocaleDateString("en-NG")}`;
    const [conv] = await db
      .insert(conversations)
      .values({ userId: session.userId, agentId, title: convTitle })
      .returning();

    return NextResponse.json(
      {
        id: conv.id,
        userId: conv.userId,
        agentId: conv.agentId,
        agentName: agent.name,
        agentSubject: agent.subject,
        title: conv.title,
        messageCount: 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
