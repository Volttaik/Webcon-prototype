import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  agentsTable,
  conversations,
  creditBalancesTable,
  creditTransactionsTable,
  agentSubscriptionsTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const AGENT_CREATION_COST = 100;
const SUBSCRIPTION_DAYS = 30;

function generateSoulMd(personality: string, tone: string, domain: string): string {
  const toneMap: Record<string, string> = {
    patient: "Calm, nurturing, and supportive",
    strict: "Direct, structured, and demanding precision",
    friendly: "Warm, conversational, and encouraging",
    socratic: "Inquisitive, thought-provoking, and guided",
    motivational: "Energetic, uplifting, and momentum-driven",
    concise: "Clear, efficient, and minimal — no fluff",
  };

  const toneDesc = toneMap[tone] || toneMap["patient"];

  const lines: string[] = [
    `## Soul Profile`,
    ``,
    `**Tone:** ${toneDesc}`,
    `**Domain:** ${domain}`,
    `**Personality Input:** ${personality}`,
    ``,
    `## Behavioral Rules`,
    ``,
  ];

  if (tone === "patient") {
    lines.push("- Break down complex topics into small digestible steps");
    lines.push("- Always acknowledge effort and provide encouragement");
    lines.push("- Use concrete examples before abstract concepts");
    lines.push("- Check for understanding before moving forward");
  } else if (tone === "strict") {
    lines.push("- Maintain high standards and expect precision");
    lines.push("- Point out errors clearly but constructively");
    lines.push("- Prioritize accuracy over comfort");
    lines.push("- Push the user to think harder before giving answers");
  } else if (tone === "socratic") {
    lines.push("- Ask probing questions to guide discovery");
    lines.push("- Never give direct answers when a question can illuminate the path");
    lines.push("- Help users arrive at conclusions through reasoning");
    lines.push("- Celebrate intellectual breakthroughs");
  } else if (tone === "friendly") {
    lines.push("- Keep conversation warm and casual");
    lines.push("- Use relatable analogies and humor when appropriate");
    lines.push("- Make the user feel comfortable asking any question");
  } else if (tone === "motivational") {
    lines.push("- Lead with energy and enthusiasm");
    lines.push("- Celebrate every milestone and progress");
    lines.push("- Frame challenges as exciting opportunities");
  } else if (tone === "concise") {
    lines.push("- Be brief and precise — value the user's time");
    lines.push("- Use bullet points and structured lists");
    lines.push("- Cut filler words and get to the point immediately");
  }

  if (personality) {
    lines.push("");
    lines.push("## Custom Personality Notes");
    lines.push(`${personality}`);
  }

  lines.push("");
  lines.push("## Verbosity");
  const verbosity =
    tone === "concise" ? "Low — compact, efficient responses" :
    tone === "patient" ? "High — thorough explanations with examples" :
    "Medium — balanced depth and clarity";
  lines.push(`${verbosity}`);

  return lines.join("\n");
}

function buildSystemPrompt(
  name: string,
  subject: string,
  level: string,
  tone: string,
  domain: string,
  soulMd: string,
  custom?: string | null
): string {
  if (custom) return custom;

  const toneMap: Record<string, string> = {
    patient: "very patient, gentle, and deeply encouraging",
    strict: "direct, structured, and demands high standards",
    friendly: "warm, casual, and conversational",
    socratic: "thought-provoking, guiding through questions",
    motivational: "energetic, positive, and deeply motivating",
    concise: "concise, efficient, and to-the-point",
  };
  const toneDesc = toneMap[tone] || "helpful and supportive";

  return `You are ${name}, an expert AI agent specializing in ${subject} for users at the ${level} level.

Your teaching style is ${toneDesc}.

## Domain
${domain}

## Soul & Personality
${soulMd}

## Capabilities
- Explain concepts clearly with relevant, relatable examples
- Create structured notes, documents, and plans using tools
- Organize workspace items and projects
- Search for current information when needed
- Generate structured outputs: plans, schedules, reports

## Tools Available
- web_search: Search the web for current information
- create_document: Save notes, presentations, speeches, plans to the user's workspace
- create_project: Create a project with tasks in the user's workspace
- plan_schedule: Create and save a structured schedule or plan

Always use the appropriate tool when the user asks to create, plan, or organize something.

Subject: ${subject}
Level: ${level}`;
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const agents = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.userId, session.userId));

    const convCounts = await Promise.all(
      agents.map(async (a) => {
        const [row] = await db
          .select({ count: count() })
          .from(conversations)
          .where(and(eq(conversations.agentId, a.id), eq(conversations.userId, session.userId)));
        return { agentId: a.id, count: row?.count ?? 0 };
      })
    );

    const countMap = new Map(convCounts.map((c) => [c.agentId, c.count]));

    const subs = await db
      .select()
      .from(agentSubscriptionsTable)
      .where(eq(agentSubscriptionsTable.userId, session.userId));

    const subMap = new Map(subs.map((s) => [s.agentId, s]));

    return NextResponse.json(
      agents.map((a) => {
        const sub = subMap.get(a.id);
        const isSubscriptionActive = sub
          ? sub.active && new Date(sub.expiresAt) > new Date()
          : false;
        return {
          id: a.id,
          userId: a.userId,
          name: a.name,
          subject: a.subject,
          level: a.level,
          tone: a.tone,
          domain: a.domain,
          personalityDescription: a.personalityDescription,
          soulMd: a.soulMd,
          systemPrompt: a.systemPrompt,
          learningHubId: a.learningHubId,
          conversationCount: Number(countMap.get(a.id) ?? 0),
          subscription: sub
            ? {
                active: isSubscriptionActive,
                expiresAt: sub.expiresAt,
                creditsCost: sub.creditsCost,
              }
            : null,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        };
      })
    );
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
      name,
      subject,
      level,
      tone = "patient",
      domain = "general",
      personalityDescription = "",
      systemPrompt,
      learningHubId,
      skipCredits,
    } = await request.json();

    if (!name || !subject || !level) {
      return NextResponse.json({ error: "name, subject, level are required" }, { status: 400 });
    }

    const creditCost = learningHubId ? 700 : AGENT_CREATION_COST;

    if (!skipCredits) {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);

      if (!balance || balance.balance < creditCost) {
        return NextResponse.json(
          { error: `Insufficient credits. Creating an agent costs ${creditCost} credits.` },
          { status: 402 }
        );
      }

      await db
        .update(creditBalancesTable)
        .set({ balance: balance.balance - creditCost, updatedAt: new Date().toISOString() })
        .where(eq(creditBalancesTable.userId, session.userId));

      await db.insert(creditTransactionsTable).values({
        userId: session.userId,
        amount: -creditCost,
        type: "agent_creation",
        description: `Created agent: ${name}`,
      });
    }

    const soulMd = generateSoulMd(personalityDescription, tone, domain);
    const generatedPrompt = buildSystemPrompt(name, subject, level, tone, domain, soulMd, systemPrompt);

    const [agent] = await db
      .insert(agentsTable)
      .values({
        userId: session.userId,
        name,
        subject,
        level,
        tone,
        domain,
        personalityDescription,
        soulMd,
        systemPrompt: generatedPrompt,
        learningHubId: learningHubId || null,
      })
      .returning();

    const expiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(agentSubscriptionsTable).values({
      userId: session.userId,
      agentId: agent.id,
      creditsCost: creditCost,
      expiresAt,
      active: true,
    });

    return NextResponse.json(
      {
        ...agent,
        conversationCount: 0,
        subscription: { active: true, expiresAt, creditsCost: creditCost },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
