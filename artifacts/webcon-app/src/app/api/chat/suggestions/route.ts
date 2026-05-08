import { NextRequest, NextResponse } from "next/server";
import { aiChat } from "@/lib/ai-service";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ suggestions: [] });

    const { content, subject } = await request.json() as { content: string; subject?: string };
    if (!content?.trim()) return NextResponse.json({ suggestions: [] });

    const prompt = `Based on this AI tutor response${subject ? ` about ${subject}` : ""}:
"""
${content.slice(0, 800)}
"""

Generate exactly 3 short follow-up questions a curious student might ask next.
Rules:
- Each question must be under 12 words
- Each must be directly related to the content
- Cover different angles (deeper dive, practical application, related concept)

Return ONLY a valid JSON array of exactly 3 strings. No explanation, no markdown, just the array.
Example: ["What is X?", "How does Y work?", "Why does Z happen?"]`;

    const result = await aiChat(
      [{ role: "user", content: prompt }],
      { maxTokens: 200, temperature: 0.8 }
    );

    const raw = result.content.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) return NextResponse.json({ suggestions: [] });

    const suggestions = JSON.parse(raw.slice(start, end + 1));
    if (!Array.isArray(suggestions)) return NextResponse.json({ suggestions: [] });

    return NextResponse.json({ suggestions: suggestions.slice(0, 3).map(String) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
