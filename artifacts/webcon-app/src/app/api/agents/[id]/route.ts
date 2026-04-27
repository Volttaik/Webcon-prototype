import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

function buildSystemPrompt(
  subject: string,
  level: string,
  tone: string,
  custom?: string | null
): string {
  if (custom) return custom;
  const toneMap: Record<string, string> = {
    patient: "very patient, gentle, and encouraging",
    strict: "direct, structured, and demanding high standards",
    friendly: "warm, casual, and conversational",
    socratic: "thought-provoking, asking questions to guide discovery",
    motivational: "energetic, positive, and deeply motivating",
  };
  const toneDesc = toneMap[tone] || "helpful and supportive";
  return `You are an expert ${subject} teacher. Your teaching style is ${toneDesc}. Subject: ${subject}, Level: ${level}`;
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
    const existing = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, session.userId)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { name, subject, level, tone, systemPrompt, avatarUrl } = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (level !== undefined) updates.level = level;
    if (tone !== undefined) updates.tone = tone;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (systemPrompt !== undefined) {
      updates.systemPrompt = systemPrompt;
    } else if (subject || level || tone) {
      updates.systemPrompt = buildSystemPrompt(
        subject || existing[0].subject,
        level || existing[0].level,
        tone || existing[0].tone,
        null
      );
    }

    const [agent] = await db
      .update(agentsTable)
      .set(updates)
      .where(eq(agentsTable.id, id))
      .returning();

    return NextResponse.json({ ...agent, conversationCount: 0 });
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
    const existing = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, id), eq(agentsTable.userId, session.userId)))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db.delete(agentsTable).where(eq(agentsTable.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
