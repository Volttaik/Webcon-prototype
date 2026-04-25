import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ suggestions: [] });

    const { content, subject } = await request.json() as { content: string; subject?: string };
    if (!content?.trim()) return NextResponse.json({ suggestions: [] });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ suggestions: [] });

    const groq = new Groq({ apiKey: groqKey });

    const prompt = `You are generating follow-up study questions for a student.

Based on this AI tutor response${subject ? ` about ${subject}` : ""}:
"""
${content.slice(0, 800)}
"""

Generate exactly 3 short follow-up questions a curious student might ask next. Each question should be:
- Under 12 words
- Directly related to the content above
- Different angles (e.g. deeper dive, practical application, related concept)

Return ONLY a JSON array of 3 strings, nothing else. Example: ["What is X?", "How does Y work?", "Why does Z happen?"]`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
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
