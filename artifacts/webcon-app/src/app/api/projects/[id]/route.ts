import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { projectsTable, projectTasksTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

async function projectWithTasks(p: typeof projectsTable.$inferSelect) {
  const tasks = await db
    .select()
    .from(projectTasksTable)
    .where(eq(projectTasksTable.projectId, p.id));
  const [agent] = p.agentId
    ? await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.id, p.agentId))
        .limit(1)
    : [null];
  return {
    id: p.id,
    userId: p.userId,
    agentId: p.agentId ?? null,
    agentName: agent?.name ?? null,
    title: p.title,
    subject: p.subject ?? null,
    type: p.type,
    status: p.status,
    dueDate: p.dueDate ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    tasks: tasks.map((t) => ({ ...t, dueDate: t.dueDate ?? null })),
  };
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

    const ex = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.userId, session.userId))
      )
      .limit(1);

    if (!ex[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, subject, type, status, dueDate } = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate).toISOString() : null;

    const [p] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, id))
      .returning();

    return NextResponse.json(await projectWithTasks(p));
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
      .delete(projectsTable)
      .where(
        and(eq(projectsTable.id, id), eq(projectsTable.userId, session.userId))
      );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
