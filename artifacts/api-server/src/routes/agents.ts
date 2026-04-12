import { Router } from "express";
import { db } from "../lib/db";
import { agentsTable, conversations } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

function buildSystemPrompt(subject: string, level: string, tone: string, custom?: string | null): string {
  if (custom) return custom;
  const toneMap: Record<string, string> = {
    patient: "very patient, gentle, and encouraging",
    strict: "direct, structured, and demanding high standards",
    friendly: "warm, casual, and conversational",
    socratic: "thought-provoking, asking questions to guide discovery",
    motivational: "energetic, positive, and deeply motivating",
  };
  const toneDesc = toneMap[tone] || "helpful and supportive";
  return `You are an expert ${subject} teacher for Nigerian students studying at the ${level} level. Your teaching style is ${toneDesc}.

Your capabilities:
- Explain concepts clearly with Nigerian context and examples when relevant
- Create structured study notes in Markdown format
- Build presentation outlines with clear slides
- Write practice speeches and essays
- Answer questions with step-by-step explanations
- Conduct quizzes and practice tests
- Search the web for current information when needed
- Create and save documents to the student's workspace

When creating documents (notes, presentations, speeches), use the create_document tool.
When you need current information, use the web_search tool.

Always be encouraging and acknowledge the student's effort. Use clear Nigerian English where appropriate.
Subject focus: ${subject}
Level: ${level}`;
}

router.get("/agents", requireAuth, async (req: AuthRequest, res) => {
  try {
    const agents = await db.select().from(agentsTable).where(eq(agentsTable.userId, req.userId!));
    const convCounts = await Promise.all(
      agents.map(async (a) => {
        const [row] = await db
          .select({ count: count() })
          .from(conversations)
          .where(and(eq(conversations.agentId, a.id), eq(conversations.userId, req.userId!)));
        return { agentId: a.id, count: row?.count ?? 0 };
      })
    );
    const countMap = new Map(convCounts.map((c) => [c.agentId, c.count]));
    res.json(
      agents.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: a.name,
        subject: a.subject,
        level: a.level,
        tone: a.tone,
        systemPrompt: a.systemPrompt,
        conversationCount: Number(countMap.get(a.id) ?? 0),
        createdAt: a.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/agents", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, subject, level, tone = "patient", systemPrompt } = req.body;
    if (!name || !subject || !level) {
      res.status(400).json({ error: "name, subject, level are required" });
      return;
    }
    const generatedPrompt = buildSystemPrompt(subject, level, tone, systemPrompt);
    const [agent] = await db
      .insert(agentsTable)
      .values({ userId: req.userId!, name, subject, level, tone, systemPrompt: generatedPrompt })
      .returning();
    res.status(201).json({ ...agent, conversationCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/agents/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)))
      .limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    const { name, subject, level, tone, systemPrompt } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (level !== undefined) updates.level = level;
    if (tone !== undefined) updates.tone = tone;
    if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
    else if (subject || level || tone) {
      updates.systemPrompt = buildSystemPrompt(
        subject || existing[0].subject,
        level || existing[0].level,
        tone || existing[0].tone,
        null
      );
    }
    const [agent] = await db.update(agentsTable).set(updates).where(eq(agentsTable.id, id)).returning();
    res.json({ ...agent, conversationCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/agents/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, req.userId!)))
      .limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    await db.delete(agentsTable).where(eq(agentsTable.id, id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
