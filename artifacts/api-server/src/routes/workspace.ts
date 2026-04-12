import { Router } from "express";
import { db } from "../lib/db";
import { workspaceItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/workspace", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, agentId } = req.query;
    let query = db.select().from(workspaceItemsTable).where(eq(workspaceItemsTable.userId, req.userId!)).$dynamic();
    const conditions = [eq(workspaceItemsTable.userId, req.userId!)];
    if (type) conditions.push(eq(workspaceItemsTable.type, type as string));
    if (agentId) conditions.push(eq(workspaceItemsTable.agentId, parseInt(agentId as string)));
    const items = await db.select().from(workspaceItemsTable).where(and(...conditions));
    res.json(items.map((i) => ({
      id: i.id, userId: i.userId, agentId: i.agentId ?? null,
      conversationId: i.conversationId ?? null, type: i.type, title: i.title,
      content: i.content, pinned: i.pinned, starred: i.starred,
      subject: i.subject ?? null, createdAt: i.createdAt, updatedAt: i.updatedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/workspace", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { type, title, content = "", agentId, conversationId, subject, pinned = false, starred = false } = req.body;
    if (!type || !title) {
      res.status(400).json({ error: "type and title are required" });
      return;
    }
    const [item] = await db.insert(workspaceItemsTable).values({
      userId: req.userId!, type, title, content,
      agentId: agentId ?? undefined, conversationId: conversationId ?? undefined,
      subject: subject ?? undefined, pinned, starred,
    }).returning();
    res.status(201).json({ ...item, agentId: item.agentId ?? null, conversationId: item.conversationId ?? null, subject: item.subject ?? null });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/workspace/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(workspaceItemsTable)
      .where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, req.userId!))).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
    const { title, content, pinned, starred, subject } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (pinned !== undefined) updates.pinned = pinned;
    if (starred !== undefined) updates.starred = starred;
    if (subject !== undefined) updates.subject = subject;
    const [item] = await db.update(workspaceItemsTable).set(updates).where(eq(workspaceItemsTable.id, id)).returning();
    res.json({ ...item, agentId: item.agentId ?? null, conversationId: item.conversationId ?? null, subject: item.subject ?? null });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/workspace/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(workspaceItemsTable).where(and(eq(workspaceItemsTable.id, id), eq(workspaceItemsTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
