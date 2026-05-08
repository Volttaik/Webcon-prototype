import { NextRequest, NextResponse } from "next/server";
import { aiChat } from "@/lib/ai-service";
import { db } from "@workspace/db";
import { learningHubsTable, hubFilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.creatorId, session.userId))
      .limit(1);

    if (!hub) return NextResponse.json({ error: "No hub found" }, { status: 404 });

    const files = await db
      .select()
      .from(hubFilesTable)
      .where(eq(hubFilesTable.hubId, hub.id))
      .limit(15);

    const { messages } = await request.json() as { messages: { role: string; content: string }[] };

    const hubContext = files.length > 0
      ? files.map(f => `### ${f.title}\n${f.content}`).join("\n\n---\n\n")
      : "No documents have been added to this hub yet. Encourage the creator to add their first document.";

    const systemPrompt = `You are an intelligent AI thought partner for "${hub.title}" — a ${hub.domain} knowledge hub.

You have read everything the creator has written. Your role is to help them think more deeply, spot gaps in their knowledge, suggest improvements, quiz them, or simply discuss the material.

## Hub Knowledge Base
${hubContext}

Be conversational, curious, and intellectually engaged. You are learning from this creator and helping them refine their expertise.`;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const result = await aiChat(chatMessages, { maxTokens: 1024, temperature: 0.7 });
    return NextResponse.json({ reply: result.content || "I couldn't generate a response." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
