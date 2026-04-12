import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { projectsTable, projectTasksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const projectId = parseInt(idStr);

    const ex = await db
      .select()
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, session.userId)
        )
      )
      .limit(1);

    if (!ex[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, dueDate } = await request.json();
    if (!title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const [task] = await db
      .insert(projectTasksTable)
      .values({
        projectId,
        title,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      })
      .returning();

    return NextResponse.json(
      { ...task, dueDate: task.dueDate ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
