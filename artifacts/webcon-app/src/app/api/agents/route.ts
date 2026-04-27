import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import {
  agentsTable,
  conversations,
  creditBalancesTable,
  creditTransactionsTable,
  agentSubscriptionsTable,
  hubSubscriptionsTable,
  learningHubsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const AGENT_CREATION_COST = 100;
const HUB_AGENT_COST = 700;
const SUBSCRIPTION_DAYS = 30;
const FREE_PLAN_AGENT_LIMIT = 5;

async function getUserPlan(userId: number): Promise<{ plan: string; active: boolean }> {
  try {
    const rows = await db.execute(
      sql`SELECT subscription_plan, subscription_expires_at FROM users WHERE id = ${userId} LIMIT 1`
    );
    const row = rows.rows?.[0] as { subscription_plan?: string; subscription_expires_at?: string } | undefined;
    const plan = row?.subscription_plan ?? "free";
    const expiresAt = row?.subscription_expires_at;
    const active = plan !== "free" && expiresAt ? new Date(expiresAt) > new Date() : false;
    return { plan, active };
  } catch {
    return { plan: "free", active: false };
  }
}

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
    `## Soul Profile`, ``, `**Tone:** ${toneDesc}`, `**Domain:** ${domain}`,
    `**Personality Input:** ${personality}`, ``, `## Behavioral Rules`, ``,
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
    lines.push(""); lines.push("## Custom Personality Notes"); lines.push(`${personality}`);
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

function buildSystemPrompt(name: string, subject: string, level: string, tone: string, domain: string, soulMd: string, custom?: string | null): string {
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
  return `You are ${name}, an expert AI agent specializing in ${subject} for users at the ${level} level.\n\nYour teaching style is ${toneDesc}.\n\n## Domain\n${domain}\n\n## Soul & Personality\n${soulMd}\n\n## Capabilities\n- Explain concepts clearly with relevant, relatable examples\n- Search for current information when needed\n- When the user explicitly asks for it, save notes, plans, projects, or schedules to their workspace\n\n## Tools Available\n- web_search: Search the web for current information\n- create_document: Save a note, summary, study guide, essay, plan, or report to the workspace\n- create_project: Create a multi-task project in the workspace\n- plan_schedule: Save a written study plan as a workspace document\n- schedule_session: Add a single study session to the calendar\n\n## Tool use rules (important)\n- Default mode is conversation. Just talk and explain.\n- Only call a tool when the user EXPLICITLY asks you to save, create, plan, schedule, or organize something. Phrases like "save this", "make a note", "create a project", "schedule a session", "plan my week" are explicit.\n- Casual messages, greetings, questions, and explanations do NOT require a tool call. Do not create files unprompted.\n- If you're unsure whether to save, just answer in chat. The user can ask you to save later.\n\nSubject: ${subject}\nLevel: ${level}`;
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
          avatarUrl: a.avatarUrl,
          learningHubId: a.learningHubId,
          conversationCount: Number(countMap.get(a.id) ?? 0),
          subscription: sub
            ? { active: isSubscriptionActive, expiresAt: sub.expiresAt, creditsCost: sub.creditsCost }
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
      name, subject, level,
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

    // Check user plan
    const { plan, active: planActive } = await getUserPlan(session.userId);
    const isCreator = plan === "creator" && planActive;
    const isPro = plan === "pro" && planActive;

    const [agentCount] = await db
      .select({ count: count() })
      .from(agentsTable)
      .where(eq(agentsTable.userId, session.userId));

    const existingAgentCount = Number(agentCount?.count ?? 0);

    // Enforce Free plan agent limit
    if (plan === "free" || !planActive) {
      if (existingAgentCount >= FREE_PLAN_AGENT_LIMIT) {
        return NextResponse.json({
          error: `Free plan is limited to ${FREE_PLAN_AGENT_LIMIT} agents. Upgrade to Pro or Creator for unlimited agents.`,
          upgradeRequired: true,
        }, { status: 402 });
      }
    }

    // For hub agents, require an active subscription and resolve the creator name.
    let resolvedName: string = name;
    if (learningHubId) {
      const [hub] = await db
        .select({
          hub: learningHubsTable,
          creatorFirst: usersTable.firstName,
          creatorLast: usersTable.lastName,
          creatorEmail: usersTable.email,
        })
        .from(learningHubsTable)
        .leftJoin(usersTable, eq(usersTable.id, learningHubsTable.creatorId))
        .where(eq(learningHubsTable.id, parseInt(String(learningHubId))))
        .limit(1);

      if (!hub) {
        return NextResponse.json({ error: "Learning hub not found" }, { status: 404 });
      }

      // The hub creator can build agents from their own hub for free without subscribing.
      const isOwnHub = hub.hub.creatorId === session.userId;
      if (!isOwnHub) {
        const [sub] = await db
          .select()
          .from(hubSubscriptionsTable)
          .where(and(
            eq(hubSubscriptionsTable.userId, session.userId),
            eq(hubSubscriptionsTable.hubId, hub.hub.id),
            eq(hubSubscriptionsTable.active, true),
          ))
          .limit(1);
        if (!sub) {
          return NextResponse.json({
            error: "Subscribe to this hub before creating an agent from it.",
            subscriptionRequired: true,
          }, { status: 403 });
        }
      }

      const fullCreator = `${hub.creatorFirst ?? ""} ${hub.creatorLast ?? ""}`.trim();
      const creatorName = fullCreator || (hub.creatorEmail ?? "").split("@")[0] || "Creator";

      // Strip any pre-existing "[by ...]" or " by ..." suffix the client may have
      // added, then re-append the canonical one to keep the convention authoritative.
      const baseName = String(name)
        .replace(/\s*\[by [^\]]+\]\s*$/i, "")
        .replace(/\s+by\s+[^[\]]+$/i, "")
        .trim();
      resolvedName = `${baseName} by ${creatorName}`;
    }

    // Calculate credit cost based on plan
    let creditCost: number;
    if (isCreator || (!learningHubId && existingAgentCount === 0)) {
      creditCost = 0; // Creator plan: all agent creation is free
    } else if (learningHubId) {
      creditCost = HUB_AGENT_COST; // 700 for hub-powered agents (pro/free)
    } else {
      creditCost = AGENT_CREATION_COST; // 100 for regular agents
    }

    // Deduct credits (skip if creator plan or skipCredits flag)
    const allowSkipCredits = skipCredits && !learningHubId && existingAgentCount === 0;
    if (!allowSkipCredits && creditCost > 0) {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, session.userId))
        .limit(1);

      if (!balance || balance.balance < creditCost) {
        return NextResponse.json(
          { error: `Insufficient credits. Creating this agent costs ${creditCost} credits.` },
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
        type: learningHubId ? "hub_agent_creation" : "agent_creation",
        description: `Created agent: ${resolvedName}`,
      });
    }

    const soulMd = generateSoulMd(personalityDescription, tone, domain);
    const generatedPrompt = buildSystemPrompt(resolvedName, subject, level, tone, domain, soulMd, systemPrompt);

    const [agent] = await db
      .insert(agentsTable)
      .values({
        userId: session.userId,
        name: resolvedName,
        subject, level, tone, domain,
        personalityDescription, soulMd,
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
