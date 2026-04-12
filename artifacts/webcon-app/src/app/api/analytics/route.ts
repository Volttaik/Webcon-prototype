import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  agentsTable,
  conversations,
  messages,
  workspaceItemsTable,
  creditBalancesTable,
  creditTransactionsTable,
} from "@workspace/db";
import { eq, and, count, sum, gte, lt } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.userId;

    const [totalMsgs] = await db
      .select({ count: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.userId, userId));

    const [totalConvs] = await db
      .select({ count: count() })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const [totalAgents] = await db
      .select({ count: count() })
      .from(agentsTable)
      .where(eq(agentsTable.userId, userId));

    const [totalItems] = await db
      .select({ count: count() })
      .from(workspaceItemsTable)
      .where(eq(workspaceItemsTable.userId, userId));

    const [usedRow] = await db
      .select({ total: sum(creditTransactionsTable.amount) })
      .from(creditTransactionsTable)
      .where(
        and(
          eq(creditTransactionsTable.userId, userId),
          eq(creditTransactionsTable.type, "usage")
        )
      );

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, userId))
      .limit(1);

    // Last 30 days by day (use ISO string comparisons for SQLite)
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setDate(dEnd.getDate() + 1);

      const [row] = await db
        .select({ count: count() })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.userId, userId),
            gte(messages.createdAt, d.toISOString()),
            lt(messages.createdAt, dEnd.toISOString())
          )
        );
      days.push({ date: d.toISOString().split("T")[0], count: Number(row?.count ?? 0) });
    }

    const agentList = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.userId, userId));

    const topAgents = await Promise.all(
      agentList.map(async (a) => {
        const [row] = await db
          .select({ count: count() })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(
            and(eq(conversations.userId, userId), eq(conversations.agentId, a.id))
          );
        return {
          agentId: a.id,
          agentName: a.name,
          subject: a.subject,
          messageCount: Number(row?.count ?? 0),
        };
      })
    );
    topAgents.sort((a, b) => b.messageCount - a.messageCount);

    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[days.length - 1 - i].count > 0) streak++;
      else break;
    }

    return NextResponse.json({
      totalMessages: Number(totalMsgs?.count ?? 0),
      totalConversations: Number(totalConvs?.count ?? 0),
      totalAgents: Number(totalAgents?.count ?? 0),
      totalWorkspaceItems: Number(totalItems?.count ?? 0),
      creditsUsed: Math.abs(Number(usedRow?.total ?? 0)),
      creditsBalance: balance?.balance ?? 0,
      messagesByDay: days,
      topAgents: topAgents.slice(0, 5),
      streakDays: streak,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
