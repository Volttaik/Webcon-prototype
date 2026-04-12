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

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, session.userId));

    return NextResponse.json(
      await Promise.all(projects.map(projectWithTasks))
    );
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

    const { title, agentId, subject, type = "general", dueDate } =
      await request.json();

    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const [p] = await db
      .insert(projectsTable)
      .values({
        userId: session.userId,
        title,
        agentId: agentId ?? undefined,
        subject,
        type,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      })
      .returning();

    return NextResponse.json(await projectWithTasks(p), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
