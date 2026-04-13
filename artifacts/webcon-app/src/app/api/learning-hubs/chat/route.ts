import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const groq = new Groq({ apiKey: groqKey });

    const hubContext = files.length > 0
      ? files.map(f => `### ${f.title}\n${f.content}`).join("\n\n---\n\n")
      : "No documents have been added to this hub yet. Encourage the creator to add their first document.";

    const systemPrompt = `You are an intelligent AI thought partner for "${hub.title}" — a ${hub.domain} knowledge hub.

You have read everything the creator has written. Your role is to help them think more deeply, spot gaps in their knowledge, suggest improvements, quiz them, or simply discuss the material.

## Hub Knowledge Base
${hubContext}

Be conversational, curious, and intellectually engaged. You are learning from this creator and helping them refine their expertise.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages as Groq.Chat.ChatCompletionMessageParam[]),
      ],
    });

    const reply = response.choices[0]?.message?.content || "I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
