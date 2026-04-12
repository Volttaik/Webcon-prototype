import { Router } from "express";
import { db } from "../lib/db";
import { messages, conversations, agentsTable, workspaceItemsTable, creditBalancesTable, creditTransactionsTable } from "@workspace/db";
import { eq, and, lt, gte, sum, count, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/analytics", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [totalMsgs] = await db.select({ count: count() }).from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.userId, userId));

    const [totalConvs] = await db.select({ count: count() }).from(conversations).where(eq(conversations.userId, userId));

    const [totalAgents] = await db.select({ count: count() }).from(agentsTable).where(eq(agentsTable.userId, userId));

    const [totalItems] = await db.select({ count: count() }).from(workspaceItemsTable).where(eq(workspaceItemsTable.userId, userId));

    const [balance] = await db.select().from(creditBalancesTable).where(eq(creditBalancesTable.userId, userId)).limit(1);

    const [usedRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
      .from(creditTransactionsTable)
      .where(and(eq(creditTransactionsTable.userId, userId), lt(creditTransactionsTable.amount, 0)));

    // Last 7 days message counts
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
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
            gte(messages.createdAt, d),
            lt(messages.createdAt, dEnd)
          )
        );
      days.push({ date: d.toISOString().split("T")[0], count: Number(row?.count ?? 0) });
    }

    // Top agents by message count
    const agentList = await db.select().from(agentsTable).where(eq(agentsTable.userId, userId));
    const topAgents = await Promise.all(
      agentList.map(async (a) => {
        const [row] = await db
          .select({ count: count() })
          .from(messages)
          .innerJoin(conversations, eq(messages.conversationId, conversations.id))
          .where(and(eq(conversations.userId, userId), eq(conversations.agentId, a.id)));
        return { agentId: a.id, agentName: a.name, subject: a.subject, messageCount: Number(row?.count ?? 0) };
      })
    );
    topAgents.sort((a, b) => b.messageCount - a.messageCount);

    // Streak days (consecutive days with messages)
    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      if (days[days.length - 1 - i].count > 0) streak++;
      else break;
    }

    res.json({
      totalMessages: Number(totalMsgs?.count ?? 0),
      totalConversations: Number(totalConvs?.count ?? 0),
      totalAgents: Number(totalAgents?.count ?? 0),
      totalWorkspaceItems: Number(totalItems?.count ?? 0),
      creditsUsed: Number(usedRow?.total ?? 0),
      creditsBalance: balance?.balance ?? 0,
      messagesByDay: days,
      topAgents: topAgents.slice(0, 5),
      streakDays: streak,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
