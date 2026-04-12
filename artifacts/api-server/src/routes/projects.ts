import { Router } from "express";
import { db } from "../lib/db";
import { projectsTable, projectTasksTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

async function projectWithTasks(p: typeof projectsTable.$inferSelect) {
  const tasks = await db.select().from(projectTasksTable).where(eq(projectTasksTable.projectId, p.id));
  const [agent] = p.agentId ? await db.select().from(agentsTable).where(eq(agentsTable.id, p.agentId)).limit(1) : [null];
  return {
    id: p.id, userId: p.userId, agentId: p.agentId ?? null, agentName: agent?.name ?? null,
    title: p.title, subject: p.subject ?? null, type: p.type, status: p.status,
    dueDate: p.dueDate ?? null, createdAt: p.createdAt, updatedAt: p.updatedAt,
    tasks: tasks.map((t) => ({ ...t, dueDate: t.dueDate ?? null })),
  };
}

router.get("/projects", requireAuth, async (req: AuthRequest, res) => {
  try {
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, req.userId!));
    res.json(await Promise.all(projects.map(projectWithTasks)));
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.post("/projects", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { title, agentId, subject, type = "general", dueDate } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const [p] = await db.insert(projectsTable).values({
      userId: req.userId!, title, agentId: agentId ?? undefined, subject, type, dueDate: dueDate ? new Date(dueDate) : undefined,
    }).returning();
    res.status(201).json(await projectWithTasks(p));
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.patch("/projects/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const ex = await db.select().from(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!))).limit(1);
    if (!ex[0]) { res.status(404).json({ error: "Not found" }); return; }
    const { title, subject, type, status, dueDate } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    const [p] = await db.update(projectsTable).set(updates).where(eq(projectsTable.id, id)).returning();
    res.json(await projectWithTasks(p));
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.delete("/projects/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, req.userId!)));
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.post("/projects/:id/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const ex = await db.select().from(projectsTable).where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, req.userId!))).limit(1);
    if (!ex[0]) { res.status(404).json({ error: "Not found" }); return; }
    const { title, dueDate } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const [task] = await db.insert(projectTasksTable).values({ projectId, title, dueDate: dueDate ? new Date(dueDate) : undefined }).returning();
    res.status(201).json({ ...task, dueDate: task.dueDate ?? null });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.patch("/projects/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { title, completed, dueDate } = req.body;
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (completed !== undefined) updates.completed = completed;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    const [task] = await db.update(projectTasksTable).set(updates).where(eq(projectTasksTable.id, taskId)).returning();
    res.json({ ...task, dueDate: task.dueDate ?? null });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

router.delete("/projects/:id/tasks/:taskId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    await db.delete(projectTasksTable).where(eq(projectTasksTable.id, taskId));
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

export default router;
