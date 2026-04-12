import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { scheduleSessionsTable, agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const sessions = await db
      .select()
      .from(scheduleSessionsTable)
      .where(eq(scheduleSessionsTable.userId, session.userId));

    const result = await Promise.all(
      sessions.map(async (s) => {
        const [agent] = s.agentId
          ? await db
              .select()
              .from(agentsTable)
              .where(eq(agentsTable.id, s.agentId))
              .limit(1)
          : [null];
        return {
          ...s,
          agentId: s.agentId ?? null,
          agentName: agent?.name ?? null,
          subject: s.subject ?? null,
          notes: s.notes ?? null,
        };
      })
    );

    return NextResponse.json(result);
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

    const {
      title,
      agentId,
      subject,
      date,
      duration = 60,
      type = "study",
      notes,
    } = await request.json();

    if (!title || !date) {
      return NextResponse.json(
        { error: "title and date required" },
        { status: 400 }
      );
    }

    const [scheduleSession] = await db
      .insert(scheduleSessionsTable)
      .values({
        userId: session.userId,
        title,
        agentId: agentId ?? undefined,
        subject,
        date: new Date(date).toISOString(),
        duration,
        type,
        notes,
      })
      .returning();

    const [agent] = scheduleSession.agentId
      ? await db
          .select()
          .from(agentsTable)
          .where(eq(agentsTable.id, scheduleSession.agentId))
          .limit(1)
      : [null];

    return NextResponse.json(
      {
        ...scheduleSession,
        agentId: scheduleSession.agentId ?? null,
        agentName: agent?.name ?? null,
        subject: scheduleSession.subject ?? null,
        notes: scheduleSession.notes ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
