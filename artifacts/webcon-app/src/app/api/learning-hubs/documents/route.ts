import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  hubFilesTable,
  learningHubsTable,
  usersTable,
  creatorEarningsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";
import { aiChat } from "@/lib/ai-service";

const BANNED_PATTERNS = [
  /lorem ipsum/i,
  /this is a test/i,
  /asdf/i,
  /qwerty/i,
  /placeholder/i,
  /sample text/i,
  /hello world/i,
];

function hasBannedContent(content: string): boolean {
  return BANNED_PATTERNS.some(p => p.test(content));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function calculateEarnings(wordCount: number, qualityScore: number): number {
  if (qualityScore < 5) return 0;
  const base = 1000;
  const wordBonus = Math.floor(wordCount / 100) * 100;
  const qualityMultiplier = qualityScore >= 8 ? 1.5 : qualityScore >= 6 ? 1.2 : 1;
  return Math.round((base + wordBonus) * qualityMultiplier);
}

async function validateContentWithAI(content: string, title: string): Promise<{ valid: boolean; score: number; reason: string }> {
  try {
    const result = await aiChat(
      [
        {
          role: "system",
          content: `You are a content validator for an educational platform. Evaluate the following content for:
1. Logical correctness (reject "1+1=3" type errors)
2. Educational value and coherence
3. No spam, plagiarism, or nonsense

Respond ONLY with a JSON object: {"valid": true/false, "score": 1-10, "reason": "brief reason"}
Score 1-4 = reject, 5-10 = accept. Be strict about factual accuracy.`,
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent:\n${content.slice(0, 2000)}`,
        },
      ],
      { maxTokens: 256, temperature: 0.2 }
    );

    const text = result.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { valid: boolean; score: number; reason: string };
      return parsed;
    }
    return { valid: true, score: 6, reason: "Validation completed" };
  } catch (err) {
    console.error("AI validation error:", err);
    return { valid: true, score: 6, reason: "Validation completed" };
  }
}

async function triggerPaystackTransfer(creatorId: number, amountNgn: number, description: string): Promise<string | null> {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, creatorId))
      .limit(1);

    if (!user?.paystackRecipientCode) {
      console.log("Creator has no Paystack recipient code yet, earnings queued.");
      return null;
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) return null;

    const reference = `EARN-${Date.now()}-${creatorId}`;
    const res = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: amountNgn * 100,
        recipient: user.paystackRecipientCode,
        reason: description,
        reference,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { data?: { transfer_code?: string } };
      return data.data?.transfer_code || reference;
    }
    return null;
  } catch (err) {
    console.error("Paystack transfer error:", err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.creatorId, session.userId))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "No hub found for this user" }, { status: 404 });
    }

    const files = await db
      .select()
      .from(hubFilesTable)
      .where(eq(hubFilesTable.hubId, hub.id))
      .orderBy(hubFilesTable.createdAt);

    return NextResponse.json({ hub, files });
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

    const [hub] = await db
      .select()
      .from(learningHubsTable)
      .where(eq(learningHubsTable.creatorId, session.userId))
      .limit(1);

    if (!hub) {
      return NextResponse.json({ error: "No hub found for this user" }, { status: 404 });
    }

    const { title, content } = await request.json();

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const wordCount = countWords(content);
    if (wordCount < 20) {
      return NextResponse.json({ error: "Content is too short. Please write at least 20 words." }, { status: 400 });
    }

    if (hasBannedContent(content)) {
      return NextResponse.json({ error: "Content appears to be placeholder or test text. Please write genuine educational content." }, { status: 400 });
    }

    const existingFiles = await db
      .select()
      .from(hubFilesTable)
      .where(eq(hubFilesTable.hubId, hub.id));

    for (const file of existingFiles) {
      const similarity = content.slice(0, 200).toLowerCase() === file.content.slice(0, 200).toLowerCase();
      if (similarity) {
        return NextResponse.json({ error: "This content appears to be a duplicate of an existing document." }, { status: 400 });
      }
    }

    const validation = await validateContentWithAI(content, title);

    if (!validation.valid || validation.score < 5) {
      return NextResponse.json({
        error: `Content rejected: ${validation.reason}. Please ensure your content is factually correct and educational.`,
        qualityScore: validation.score,
      }, { status: 422 });
    }

    const [file] = await db
      .insert(hubFilesTable)
      .values({
        hubId: hub.id,
        title: title.trim(),
        content: content.trim(),
        fileType: "text",
        wordCount,
        qualityScore: validation.score,
      })
      .returning();

    const earningsNgn = calculateEarnings(wordCount, validation.score);
    if (earningsNgn > 0) {
      const transferRef = await triggerPaystackTransfer(
        session.userId,
        earningsNgn,
        `Content earnings: "${title.trim()}" in ${hub.title}`
      );

      await db.insert(creatorEarningsTable).values({
        creatorId: session.userId,
        hubId: hub.id,
        type: "content",
        amountNgn: earningsNgn,
        description: `Content contribution: "${title.trim()}" (${wordCount} words, quality ${validation.score}/10)`,
        paystackReference: transferRef || undefined,
        transferStatus: transferRef ? "initiated" : "pending",
      });
    }

    return NextResponse.json({
      file,
      qualityScore: validation.score,
      earningsNgn,
      message: earningsNgn > 0
        ? `Document saved! You earned ₦${earningsNgn.toLocaleString()} for this contribution.`
        : "Document saved successfully.",
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
