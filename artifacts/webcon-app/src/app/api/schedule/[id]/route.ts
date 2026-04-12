import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { scheduleSessionsTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

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

    const existing = await db
      .select()
      .from(scheduleSessionsTable)
      .where(
        and(
          eq(scheduleSessionsTable.id, id),
          eq(scheduleSessionsTable.userId, session.userId)
        )
      )
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, subject, date, duration, type, completed, notes } =
      await request.json();
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (subject !== undefined) updates.subject = subject;
    if (date !== undefined) updates.date = new Date(date);
    if (duration !== undefined) updates.duration = duration;
    if (type !== undefined) updates.type = type;
    if (completed !== undefined) updates.completed = completed;
    if (notes !== undefined) updates.notes = notes;

    const [scheduleSession] = await db
      .update(scheduleSessionsTable)
      .set(updates)
      .where(eq(scheduleSessionsTable.id, id))
      .returning();

    const [agent] = scheduleSession.agentId
      ? await db
          .select()
          .from(agentsTable)
          .where(eq(agentsTable.id, scheduleSession.agentId))
          .limit(1)
      : [null];

    return NextResponse.json({
      ...scheduleSession,
      agentId: scheduleSession.agentId ?? null,
      agentName: agent?.name ?? null,
      subject: scheduleSession.subject ?? null,
      notes: scheduleSession.notes ?? null,
    });
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
      .delete(scheduleSessionsTable)
      .where(
        and(
          eq(scheduleSessionsTable.id, id),
          eq(scheduleSessionsTable.userId, session.userId)
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
