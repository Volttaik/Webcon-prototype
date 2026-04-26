import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { db } from "@workspace/db";
import {
  conversations,
  messages,
  agentsTable,
  creditBalancesTable,
  creditTransactionsTable,
  workspaceItemsTable,
  projectsTable,
  projectTasksTable,
  agentMemoryTable,
  agentFilesTable,
  hubFilesTable,
  scheduleSessionsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const COST_PER_MESSAGE = 1;
const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const INLINE_FUNCTION_RE = /<function=([a-zA-Z0-9_]+)\s*>([\s\S]*?)<\/function>/g;

type InlineCall = { id: string; name: string; argsJson: string };

function parseInlineFunctionCalls(content: string | null | undefined): {
  calls: InlineCall[];
  cleaned: string;
} {
  if (!content) return { calls: [], cleaned: "" };
  const calls: InlineCall[] = [];
  let i = 0;
  const cleaned = content.replace(INLINE_FUNCTION_RE, (_m, name: string, body: string) => {
    let argsJson = (body || "").trim();
    try {
      JSON.parse(argsJson);
    } catch {
      const first = argsJson.indexOf("{");
      const last = argsJson.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        const slice = argsJson.slice(first, last + 1);
        try {
          JSON.parse(slice);
          argsJson = slice;
        } catch {
          argsJson = "{}";
        }
      } else {
        argsJson = "{}";
      }
    }
    calls.push({ id: `inline_${i++}`, name, argsJson });
    return "";
  });
  return { calls, cleaned: cleaned.trim() };
}

async function getUserPlan(userId: number): Promise<{ plan: string; active: boolean }> {
  try {
    const rows = await db.execute(
      sql`SELECT subscription_plan, subscription_expires_at FROM users WHERE id = ${userId} LIMIT 1`
    );
    const row = (rows as { rows?: Record<string, string>[] }).rows?.[0];
    const plan = row?.subscription_plan ?? "free";
    const expiresAt = row?.subscription_expires_at;
    const active = plan !== "free" && expiresAt ? new Date(expiresAt) > new Date() : false;
    return { plan, active };
  } catch {
    return { plan: "free", active: false };
  }
}

function buildSystemPrompt(
  agent: {
    name: string;
    subject: string;
    level: string;
    tone: string;
    domain: string;
    soulMd: string | null;
    personalityDescription: string | null;
    systemPrompt: string | null;
  } | null,
  memory: string,
  hubContext: string,
  agentFilesContext: string,
  todayIso: string,
  hasImage: boolean
): string {
  if (!agent) {
    return `You are EduBridge, a sharp, friendly study companion. Today is ${todayIso}. Be concise, structured, and explain reasoning step-by-step. Use markdown for clarity. ${hasImage ? "The user has attached an image — analyze it carefully and refer to specific details you observe." : ""}`;
  }

  const soulSection =
    agent.soulMd ||
    (agent.personalityDescription ? `Personality: ${agent.personalityDescription}` : "");
  const base =
    agent.systemPrompt ||
    `You are ${agent.name}, an expert AI study agent specializing in ${agent.subject} for a ${agent.level}-level student. Your tone: ${agent.tone}.`;

  const soulBlock = soulSection ? `\n\n## Personality\n${soulSection}` : "";
  const memoryBlock = memory
    ? `\n\n## What you remember about this student\n${memory}`
    : "";
  const hubBlock = hubContext
    ? `\n\n## Knowledge base (cite when relevant)\nYou have access to the following course materials. Quote and reference them when answering:\n\n${hubContext}`
    : "";
  const agentFilesBlock = agentFilesContext
    ? `\n\n## Personal study materials uploaded by the student to this agent\nThese are the student's own course documents (syllabus, lecture notes, textbook chapters). Treat them as the authoritative source for this course. Cite the document title in your answer when you use them. If a question can be answered from these materials, prefer them over generic knowledge.\n\n${agentFilesContext}`
    : "";

  const principles = `\n\n## How you respond
- Today's date is ${todayIso}.
- Be precise and pedagogical — explain *why*, not just *what*.
- Use markdown: short paragraphs, bullets, **bold** key terms, and fenced code blocks for code or math.
- For math, use LaTeX inside $$ ... $$ for displayed equations and $ ... $ inline.
- When the student is stuck, scaffold: ask one clarifying question, then teach.
- If you don't know something current or factual, say so AND use the web_search tool to find out.
- Stay grounded in ${agent.subject}. If asked off-topic, briefly help, then bring focus back.`;

  const visionBlock = hasImage
    ? `\n\n## Image attached
The student has attached an image. Analyze it carefully:
- Describe what you see relevant to the question
- If it's homework, a diagram, handwritten notes, a screenshot, or a textbook page — read and reason about its contents
- Quote any text you can read in the image
- Solve or explain step-by-step`
    : "";

  const toolGuidance = `\n\n## Tools you can use (use them when actually helpful, not just because the user mentions them)
- **web_search** — for current events, recent papers, things you may not know, fact-checking.
- **schedule_session** — when the student wants to plan, book, or schedule a study session, exam prep, etc. Use the date/time the student gives you (relative to today: ${todayIso}).
- **create_document** — when the student asks you to write, save, or create a note, summary, study guide, essay, plan, or report.
- **create_project** — when the student asks for a multi-step project, research plan, or assignment breakdown.
- **plan_schedule** — for a written study plan document (NOT a single calendar session — use schedule_session for that).

Never use a tool unless it directly serves the student's request.`;

  return `${base}${soulBlock}${memoryBlock}${hubBlock}${agentFilesBlock}${principles}${visionBlock}${toolGuidance}`;
}

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for current information, recent events, fact-check, or things you don't know. Returns a synthesized summary of top results.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Concise search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_session",
      description:
        "Add a study session to the student's calendar/schedule. Use when they want to plan or book a study time.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short session title" },
          date: {
            type: "string",
            description:
              "Full ISO 8601 datetime (e.g. 2026-04-25T16:00:00). Resolve relative dates like 'tomorrow at 4pm' against today's date.",
          },
          duration: { type: "number", description: "Duration in minutes (default 60)" },
          subject: { type: "string", description: "Subject the session covers" },
          type: {
            type: "string",
            enum: ["study", "practice", "review", "exam_prep", "project", "reading"],
          },
          notes: { type: "string", description: "Brief description of what to focus on" },
        },
        required: ["title", "date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_document",
      description:
        "Create and save a document (note, study guide, summary, essay, etc.) to the student's workspace.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["note", "presentation", "speech", "plan", "report"],
          },
          title: { type: "string" },
          content: { type: "string", description: "Full markdown content" },
          subject: { type: "string" },
        },
        required: ["type", "title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a multi-task project to break down a larger goal.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          subject: { type: "string" },
          type: {
            type: "string",
            enum: ["study", "research", "assignment", "general"],
          },
          tasks: { type: "array", items: { type: "string" } },
        },
        required: ["title", "tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_schedule",
      description: "Save a written study plan as a document (not a calendar session).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          subject: { type: "string" },
        },
        required: ["title", "content"],
      },
    },
  },
];

async function doWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        query
      )}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = (await response.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      AbstractSource?: string;
      Heading?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
      Results?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const lines: string[] = [];
    if (data.Heading) lines.push(`# ${data.Heading}`);
    if (data.AbstractText) {
      lines.push(data.AbstractText);
      if (data.AbstractURL && data.AbstractSource) {
        lines.push(`Source: ${data.AbstractSource} — ${data.AbstractURL}`);
      }
    }

    const flatTopics: Array<{ Text?: string; FirstURL?: string }> = [];
    for (const item of data.RelatedTopics || []) {
      if (item.Topics) flatTopics.push(...item.Topics);
      else flatTopics.push(item);
    }

    if (data.Results && data.Results.length > 0) {
      lines.push("\n## Top results");
      data.Results.slice(0, 5).forEach((r, i) => {
        if (r.Text) lines.push(`${i + 1}. ${r.Text}${r.FirstURL ? ` (${r.FirstURL})` : ""}`);
      });
    }

    if (flatTopics.length > 0) {
      lines.push("\n## Related");
      flatTopics
        .filter((t) => t.Text)
        .slice(0, 5)
        .forEach((t, i) => {
          lines.push(`${i + 1}. ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`);
        });
    }

    if (lines.length === 0) {
      return `No structured results for "${query}". Use general knowledge and clearly mark uncertainty.`;
    }
    return lines.join("\n");
  } catch {
    return `Web search failed for "${query}". Answer from general knowledge and tell the user the search couldn't be completed.`;
  }
}

function detectVerbFromMessage(content: string, hasImage: boolean): string {
  if (hasImage) return "looking";
  const t = content.trim().toLowerCase();
  if (/schedul|plan.*(session|study|tomorrow|today|next week)|book.*time/i.test(t))
    return "planning";
  if (/create\s+(a\s+)?project|new project|organize/i.test(t)) return "creating";
  if (/create\s+(a\s+)?(file|note|document|doc|plan|study guide|summary)/i.test(t))
    return "creating";
  if (/search|find|look up|latest|news|current/i.test(t)) return "searching";
  if (/explain|what is|who is|when did|where is|why/i.test(t)) return "thinking";
  return "thinking";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)))
      .limit(1);

    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    return NextResponse.json(
      msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        imageUrl: m.imageUrl ?? null,
        verb: m.verb ?? null,
        thinkMs: m.thinkMs ?? null,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id: idStr } = await params;
    const convId = parseInt(idStr);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convId), eq(conversations.userId, session.userId)))
      .limit(1);

    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const { plan: userPlan, active: planActive } = await getUserPlan(session.userId);
    const isCreatorPlan = userPlan === "creator" && planActive;

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    if (!isCreatorPlan && (!balance || balance.balance < COST_PER_MESSAGE)) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    const body = await request.json();
    const content: string = body.content || "";
    const imageUrl: string | undefined = body.imageUrl || undefined;
    const hasImage = !!imageUrl;

    if (!content?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: "Message content or image required" },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI chat is not configured" }, { status: 503 });
    }
    const groq = new Groq({ apiKey: groqApiKey });

    const [agent] = conv.agentId
      ? await db
          .select()
          .from(agentsTable)
          .where(eq(agentsTable.id, conv.agentId))
          .limit(1)
      : [null];

    let hubContext = "";
    if (agent?.learningHubId) {
      const hubFiles = await db
        .select()
        .from(hubFilesTable)
        .where(eq(hubFilesTable.hubId, agent.learningHubId))
        .limit(10);
      if (hubFiles.length > 0) {
        hubContext = hubFiles
          .map((f) => `### ${f.title}\n${f.content}`)
          .join("\n\n---\n\n");
      }
    }

    let agentFilesContext = "";
    if (agent) {
      const agentFiles = await db
        .select()
        .from(agentFilesTable)
        .where(eq(agentFilesTable.agentId, agent.id))
        .orderBy(agentFilesTable.createdAt);
      if (agentFiles.length > 0) {
        // Soft cap total chars to keep prompt size sane (~50k chars ≈ 12-15k tokens)
        const MAX_TOTAL = 50_000;
        let used = 0;
        const chunks: string[] = [];
        for (const f of agentFiles) {
          const remaining = MAX_TOTAL - used;
          if (remaining <= 200) break;
          const body = f.content.length > remaining ? f.content.slice(0, remaining) + "\n…[truncated]" : f.content;
          chunks.push(`### ${f.title}\n${body}`);
          used += body.length + f.title.length + 8;
        }
        agentFilesContext = chunks.join("\n\n---\n\n");
      }
    }

    const memoryRows = agent
      ? await db
          .select()
          .from(agentMemoryTable)
          .where(
            and(
              eq(agentMemoryTable.agentId, agent.id),
              eq(agentMemoryTable.userId, session.userId)
            )
          )
          .orderBy(desc(agentMemoryTable.updatedAt))
          .limit(15)
      : [];

    const memoryContext = memoryRows.map((m) => m.content).join("\n");

    const userMessageContent =
      content.trim() || (imageUrl ? "[Image attached — please analyze]" : "");

    const [userMsg] = await db
      .insert(messages)
      .values({
        conversationId: convId,
        role: "user",
        content: userMessageContent,
        imageUrl: imageUrl || null,
      })
      .returning();

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    // Build chat history. The most-recent user message gets vision content
    // when imageUrl exists; older history is text-only.
    const trimmed = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20);

    const chatMessages: Groq.Chat.ChatCompletionMessageParam[] = trimmed.map((m, idx) => {
      const isLast = idx === trimmed.length - 1;
      if (isLast && m.role === "user" && hasImage && imageUrl) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content || "Please analyze this image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        } as Groq.Chat.ChatCompletionMessageParam;
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });

    const todayIso = new Date().toISOString().slice(0, 10);
    const detectedVerb = hasImage
      ? "looking"
      : agent?.learningHubId && hubContext
        ? "reading-hub"
        : agentFilesContext
          ? "reading-notes"
          : detectVerbFromMessage(content, hasImage);

    const systemPrompt = buildSystemPrompt(
      agent
        ? {
            name: agent.name,
            subject: agent.subject,
            level: agent.level,
            tone: agent.tone,
            domain: agent.domain || "general",
            soulMd: agent.soulMd,
            personalityDescription: agent.personalityDescription,
            systemPrompt: agent.systemPrompt,
          }
        : null,
      memoryContext,
      hubContext,
      agentFilesContext,
      todayIso,
      hasImage
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        const startTime = Date.now();
        let activeVerb = detectedVerb;

        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: "verb", verb: activeVerb });

          const groqMessages: Groq.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ];

          // Vision model path — no tools support; stream directly.
          if (hasImage) {
            const visionStream = await groq.chat.completions.create({
              model: VISION_MODEL,
              max_tokens: 4096,
              messages: groqMessages,
              stream: true,
            });
            for await (const chunk of visionStream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                send({ type: "text", text: delta });
              }
            }
          } else {
            // Text path — full tool support
            const response = await groq.chat.completions.create({
              model: TEXT_MODEL,
              max_tokens: 4096,
              messages: groqMessages,
              tools: TOOLS,
              tool_choice: "auto",
              stream: false,
            });

            const choice = response.choices[0];
            const realToolCalls = choice.message.tool_calls || [];

            // Llama sometimes leaks `<function=NAME>{...}</function>` as plain
            // text content instead of using the structured tool_calls field.
            // Re-route those through the proper tool-execution path so the
            // user never sees the raw markup and the streaming/typing
            // animation still fires from the follow-up completion call.
            const inlineParsed = parseInlineFunctionCalls(choice.message.content);
            if (realToolCalls.length === 0 && inlineParsed.calls.length > 0) {
              choice.message.content = inlineParsed.cleaned;
            }

            const toolCalls: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }> =
              realToolCalls.length > 0
                ? (realToolCalls as unknown as Array<{
                    id: string;
                    type: "function";
                    function: { name: string; arguments: string };
                  }>)
                : inlineParsed.calls.map((c) => ({
                    id: c.id,
                    type: "function" as const,
                    function: { name: c.name, arguments: c.argsJson },
                  }));

            for (const toolCall of toolCalls) {
              const toolName = toolCall.function.name;
              let toolArgs: Record<string, unknown> = {};
              try {
                toolArgs = JSON.parse(toolCall.function.arguments || "{}");
              } catch {
                toolArgs = {};
              }

              if (toolName === "web_search") {
                activeVerb = "searching";
                send({ type: "verb", verb: "searching" });
                const searchResult = await doWebSearch(toolArgs.query as string);
                groqMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: [toolCall],
                });
                groqMessages.push({
                  role: "tool",
                  content: searchResult,
                  tool_call_id: toolCall.id,
                });
                send({ type: "tool_use", tool: "web_search", query: toolArgs.query });
              } else if (toolName === "schedule_session") {
                activeVerb = "planning";
                send({ type: "verb", verb: "planning" });
                try {
                  const dateStr = toolArgs.date as string;
                  const parsedDate = new Date(dateStr);
                  if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
                  const [scheduleSession] = await db
                    .insert(scheduleSessionsTable)
                    .values({
                      userId: session.userId,
                      agentId: conv.agentId ?? undefined,
                      title: (toolArgs.title as string) || "Study session",
                      subject: (toolArgs.subject as string) || agent?.subject,
                      date: parsedDate.toISOString(),
                      duration: (toolArgs.duration as number) || 60,
                      type: (toolArgs.type as string) || "study",
                      notes: toolArgs.notes as string | undefined,
                    })
                    .returning();
                  groqMessages.push({
                    role: "assistant",
                    content: null,
                    tool_calls: [toolCall],
                  });
                  groqMessages.push({
                    role: "tool",
                    content: `Session scheduled for ${parsedDate.toLocaleString()}: "${scheduleSession.title}". The student can view it on the Schedule page.`,
                    tool_call_id: toolCall.id,
                  });
                  send({
                    type: "tool_use",
                    tool: "schedule_session",
                    title: scheduleSession.title,
                    path: "/schedule",
                  });
                } catch (e) {
                  groqMessages.push({
                    role: "assistant",
                    content: null,
                    tool_calls: [toolCall],
                  });
                  groqMessages.push({
                    role: "tool",
                    content: `Failed to schedule session — invalid date format. Please retry with a valid ISO datetime.`,
                    tool_call_id: toolCall.id,
                  });
                }
              } else if (toolName === "create_document") {
                activeVerb = "creating";
                send({ type: "verb", verb: "creating" });
                await db.insert(workspaceItemsTable).values({
                  userId: session.userId,
                  type: (toolArgs.type as string) || "note",
                  title: toolArgs.title as string,
                  content: toolArgs.content as string,
                  agentId: conv.agentId ?? undefined,
                  conversationId: convId,
                  subject: (toolArgs.subject as string) || agent?.subject,
                });
                groqMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: [toolCall],
                });
                groqMessages.push({
                  role: "tool",
                  content: `Document "${toolArgs.title}" saved to the student's workspace.`,
                  tool_call_id: toolCall.id,
                });
                send({
                  type: "tool_use",
                  tool: "create_document",
                  title: toolArgs.title,
                  path: "/workspace",
                });
              } else if (toolName === "create_project") {
                activeVerb = "creating";
                send({ type: "verb", verb: "creating" });
                const [project] = await db
                  .insert(projectsTable)
                  .values({
                    userId: session.userId,
                    agentId: conv.agentId ?? undefined,
                    title: toolArgs.title as string,
                    subject: (toolArgs.subject as string) || agent?.subject,
                    type: (toolArgs.type as string) || "general",
                    status: "active",
                  })
                  .returning();
                const taskList = (toolArgs.tasks as string[]) || [];
                for (const taskTitle of taskList) {
                  await db
                    .insert(projectTasksTable)
                    .values({ projectId: project.id, title: taskTitle });
                }
                groqMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: [toolCall],
                });
                groqMessages.push({
                  role: "tool",
                  content: `Project "${toolArgs.title}" created with ${taskList.length} tasks.`,
                  tool_call_id: toolCall.id,
                });
                send({
                  type: "tool_use",
                  tool: "create_project",
                  title: toolArgs.title,
                  path: "/projects",
                });
              } else if (toolName === "plan_schedule") {
                activeVerb = "planning";
                send({ type: "verb", verb: "planning" });
                await db.insert(workspaceItemsTable).values({
                  userId: session.userId,
                  type: "plan",
                  title: toolArgs.title as string,
                  content: toolArgs.content as string,
                  agentId: conv.agentId ?? undefined,
                  conversationId: convId,
                  subject: (toolArgs.subject as string) || agent?.subject,
                });
                groqMessages.push({
                  role: "assistant",
                  content: null,
                  tool_calls: [toolCall],
                });
                groqMessages.push({
                  role: "tool",
                  content: `Plan "${toolArgs.title}" saved.`,
                  tool_call_id: toolCall.id,
                });
                send({
                  type: "tool_use",
                  tool: "plan_schedule",
                  title: toolArgs.title,
                  path: "/workspace",
                });
              }
            }

            if (toolCalls.length > 0) {
              const finalResponse = await groq.chat.completions.create({
                model: TEXT_MODEL,
                max_tokens: 4096,
                messages: groqMessages,
                stream: true,
              });
              for await (const chunk of finalResponse) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  send({ type: "text", text: delta });
                }
              }
            } else if (choice.message.content) {
              // No tool calls — model already returned content.
              // Final safety net: scrub any `<function=...>...</function>`
              // markup that slipped through without parseable JSON.
              fullText = choice.message.content
                .replace(INLINE_FUNCTION_RE, "")
                .trim();
              // Stream it out in chunks for nicer UX
              const chunks = fullText.match(/[\s\S]{1,30}/g) || [fullText];
              for (const c of chunks) {
                send({ type: "text", text: c });
              }
            }
          }

          const thinkMs = Date.now() - startTime;

          const [assistantMsg] = await db
            .insert(messages)
            .values({
              conversationId: convId,
              role: "assistant",
              content: fullText || "(no response)",
              thinkMs,
              verb: activeVerb,
            })
            .returning();

          if (!isCreatorPlan && balance) {
            await db
              .update(creditBalancesTable)
              .set({
                balance: balance.balance - COST_PER_MESSAGE,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(creditBalancesTable.userId, session.userId));

            await db.insert(creditTransactionsTable).values({
              userId: session.userId,
              amount: -COST_PER_MESSAGE,
              type: "usage",
              description: `${hasImage ? "Image" : "AI"} message · ${
                agent?.name || "EduBridge"
              }`,
            });
          }

          await db
            .update(conversations)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(conversations.id, convId));

          if (agent && fullText.length > 100) {
            const existingMemory = await db
              .select()
              .from(agentMemoryTable)
              .where(
                and(
                  eq(agentMemoryTable.agentId, agent.id),
                  eq(agentMemoryTable.userId, session.userId),
                  eq(agentMemoryTable.memoryType, "long_term")
                )
              )
              .limit(15);

            const snippet = `Discussed: ${content.trim().slice(0, 200)}`;
            const isDuplicate = existingMemory.some((m) => m.content === snippet);
            if (!isDuplicate && existingMemory.length < 15) {
              await db.insert(agentMemoryTable).values({
                agentId: agent.id,
                userId: session.userId,
                memoryType: "long_term",
                content: snippet,
              });
            }
          }

          send({
            type: "done",
            userMessageId: userMsg.id,
            assistantMessageId: assistantMsg.id,
            creditsRemaining: isCreatorPlan
              ? balance?.balance ?? 0
              : (balance?.balance ?? 0) - COST_PER_MESSAGE,
            verb: activeVerb,
            thinkMs,
            isHubPowered: !!(agent?.learningHubId && hubContext),
            hadImage: hasImage,
          });
        } catch (err) {
          console.error("Streaming error:", err);
          send({
            type: "error",
            error: "AI error occurred. Please try again.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
