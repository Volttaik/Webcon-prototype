import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { projectTasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskId: taskIdStr } = await params;
    const taskId = parseInt(taskIdStr);
    const { title, completed, dueDate } = await request.json();

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (completed !== undefined) updates.completed = completed;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    const [task] = await db
      .update(projectTasksTable)
      .set(updates)
      .where(eq(projectTasksTable.id, taskId))
      .returning();

    return NextResponse.json({ ...task, dueDate: task.dueDate ?? null });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskId: taskIdStr } = await params;
    const taskId = parseInt(taskIdStr);

    await db
      .delete(projectTasksTable)
      .where(eq(projectTasksTable.id, taskId));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
