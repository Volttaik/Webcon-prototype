import { Router } from "express";
import { db } from "../lib/db";
import { scheduleSessionsTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

router.get("/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessions = await db.select().from(scheduleSessionsTable).where(eq(scheduleSessionsTable.userId, req.userId!));
    const result = await Promise.all(sessions.map(async (s) => {
      const [agent] = s.agentId ? await db.select().from(agentsTable).where(eq(agentsTable.id, s.agentId)).limit(1) : [null];
      return { ...s, agentId: s.agentId ?? null, agentName: agent?.name ?? null, subject: s.subject ?? null, notes: s.notes ?? null };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.post("/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, agentId, subject, date, duration = 60, type = "study", notes } = req.body;
    if (!title || !date) { res.status(400).json({ error: "title and date required" }); return; }
    const [session] = await db.insert(scheduleSessionsTable).values({
      userId: req.userId!, title, agentId: agentId ?? undefined, subject, date: new Date(date), duration, type, notes,
    }).returning();
    const [agent] = session.agentId ? await db.select().from(agentsTable).where(eq(agentsTable.id, session.agentId)).limit(1) : [null];
    res.status(201).json({ ...session, agentId: session.agentId ?? null, agentName: agent?.name ?? null, subject: session.subject ?? null, notes: session.notes ?? null });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.patch("/schedule/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(scheduleSessionsTable).where(and(eq(scheduleSessionsTable.id, id), eq(scheduleSessionsTable.userId, req.userId!))).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
    const { title, subject, date, duration, type, completed, notes } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (date !== undefined) updates.date = new Date(date);
    if (duration !== undefined) updates.duration = duration;
    if (type !== undefined) updates.type = type;
    if (completed !== undefined) updates.completed = completed;
    if (notes !== undefined) updates.notes = notes;
    const [session] = await db.update(scheduleSessionsTable).set(updates).where(eq(scheduleSessionsTable.id, id)).returning();
    const [agent] = session.agentId ? await db.select().from(agentsTable).where(eq(agentsTable.id, session.agentId)).limit(1) : [null];
    res.json({ ...session, agentId: session.agentId ?? null, agentName: agent?.name ?? null, subject: session.subject ?? null, notes: session.notes ?? null });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.delete("/schedule/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(scheduleSessionsTable).where(and(eq(scheduleSessionsTable.id, id), eq(scheduleSessionsTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

export default router;
