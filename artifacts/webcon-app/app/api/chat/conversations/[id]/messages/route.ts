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
  agentSubscriptionsTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COST_PER_MESSAGE = 1;

function generateSoulMd(soulMd: string | null, personalityDescription: string | null): string {
  if (!soulMd && !personalityDescription) return "";
  return soulMd || `Personality: ${personalityDescription}`;
}

function buildGroqSystemPrompt(agent: {
  name: string;
  subject: string;
  level: string;
  tone: string;
  domain: string;
  soulMd: string | null;
  personalityDescription: string | null;
  systemPrompt: string | null;
}, memory: string): string {
  const soulSection = generateSoulMd(agent.soulMd, agent.personalityDescription);

  const base = agent.systemPrompt || `You are ${agent.name}, an expert AI agent specializing in ${agent.subject} for users at the ${agent.level} level.`;

  const soulBlock = soulSection ? `\n\n## Personality & Soul\n${soulSection}` : "";

  const memoryBlock = memory ? `\n\n## Long-term Memory\nYou remember these things about this user:\n${memory}` : "";

  const toolGuidance = `\n\n## Tool Use Guidelines
IMPORTANT: Only use tools when the user EXPLICITLY asks for them. Do NOT call tools for casual conversation, greetings, or simple questions.
- Use \`web_search\` ONLY when asked to search the web, look something up, or find current information.
- Use \`create_document\` ONLY when the user explicitly asks you to create, write, save, or generate a document, note, or file.
- Use \`create_project\` ONLY when the user explicitly asks you to create a project or organize tasks.
- Use \`plan_schedule\` ONLY when the user explicitly asks you to plan or create a schedule.
- For all other messages (explanations, answers, casual chat), respond with text only.`;

  return `${base}${soulBlock}${memoryBlock}${toolGuidance}`;
}

const TOOLS: Groq.Chat.CompletionCreateParams.Tool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, recent events, or facts.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_document",
      description: "Create and save a document (note, presentation outline, speech, plan, or report) to the user's workspace.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["note", "presentation", "speech", "plan", "report"], description: "Document type" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Full document content in Markdown format" },
          subject: { type: "string", description: "Subject or topic of the document" },
        },
        required: ["type", "title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a new project in the user's workspace with tasks.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Project title" },
          subject: { type: "string", description: "Project subject or domain" },
          type: { type: "string", enum: ["study", "research", "assignment", "general"], description: "Project type" },
          tasks: {
            type: "array",
            items: { type: "string" },
            description: "List of task titles for this project",
          },
        },
        required: ["title", "tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "plan_schedule",
      description: "Create a structured schedule or plan and save it as a workspace document.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Schedule/plan title" },
          content: { type: "string", description: "The full structured schedule in Markdown format" },
          subject: { type: "string", description: "Subject or area this schedule covers" },
        },
        required: ["title", "content"],
      },
    },
  },
];

async function doWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = (await response.json()) as {
      AbstractText?: string;
      RelatedTopics?: { Text?: string }[];
    };
    const abstract = data.AbstractText || "";
    const related = (data.RelatedTopics || [])
      .slice(0, 3)
      .map((t) => t.Text || "")
      .filter(Boolean)
      .join("\n");
    return abstract || related || `Search results for: ${query} (no additional summary available)`;
  } catch {
    return `Could not fetch web results for: ${query}`;
  }
}

function detectVerbFromMessage(content: string): string {
  const t = content.trim().toLowerCase();
  if (/create\s+(a\s+)?project|new project|organize/i.test(t)) return "creating";
  if (/create\s+(a\s+)?(file|note|document|doc|plan|schedule)|plan\s+my|schedule/i.test(t)) return "creating";
  if (/search|find|look up|what is|who is|when did|where is/i.test(t)) return "searching";
  if (/plan|outline|structure|break down|schedule/i.test(t)) return "planning";
  return "thinking";
}

export async function GET(
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

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, session.userId)))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

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
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const convId = parseInt(idStr);

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convId), eq(conversations.userId, session.userId)))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, session.userId))
      .limit(1);

    if (!balance || balance.balance < COST_PER_MESSAGE) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    if (conv.agentId) {
      const [sub] = await db
        .select()
        .from(agentSubscriptionsTable)
        .where(
          and(
            eq(agentSubscriptionsTable.userId, session.userId),
            eq(agentSubscriptionsTable.agentId, conv.agentId),
            eq(agentSubscriptionsTable.active, true)
          )
        )
        .limit(1);

      if (sub && new Date(sub.expiresAt) < new Date()) {
        await db
          .update(agentSubscriptionsTable)
          .set({ active: false })
          .where(eq(agentSubscriptionsTable.id, sub.id));
        return NextResponse.json({ error: "Agent subscription expired. Please renew." }, { status: 402 });
      }
    }

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 });
    }

    const [agent] = conv.agentId
      ? await db.select().from(agentsTable).where(eq(agentsTable.id, conv.agentId)).limit(1)
      : [null];

    const memoryRows = agent
      ? await db
          .select()
          .from(agentMemoryTable)
          .where(and(eq(agentMemoryTable.agentId, agent.id), eq(agentMemoryTable.userId, session.userId)))
          .orderBy(desc(agentMemoryTable.updatedAt))
          .limit(5)
      : [];

    const memoryContext = memoryRows.map((m) => m.content).join("\n");

    const [userMsg] = await db
      .insert(messages)
      .values({ conversationId: convId, role: "user", content: content.trim() })
      .returning();

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const chatMessages: Groq.Chat.ChatCompletionMessageParam[] = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const detectedVerb = detectVerbFromMessage(content);
    const systemPrompt = agent
      ? buildGroqSystemPrompt(
          {
            name: agent.name,
            subject: agent.subject,
            level: agent.level,
            tone: agent.tone,
            domain: agent.domain || "general",
            soulMd: agent.soulMd,
            personalityDescription: agent.personalityDescription,
            systemPrompt: agent.systemPrompt,
          },
          memoryContext
        )
      : "You are a helpful, intelligent AI assistant. Format your responses clearly.";

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

          const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            max_tokens: 4096,
            messages: groqMessages,
            tools: TOOLS,
            tool_choice: "auto",
            stream: false,
          });

          const choice = response.choices[0];
          const toolCalls = choice.message.tool_calls || [];

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
              groqMessages.push({ role: "assistant", content: null, tool_calls: [toolCall] });
              groqMessages.push({ role: "tool", content: searchResult, tool_call_id: toolCall.id });
              send({ type: "tool_use", tool: "web_search", query: toolArgs.query });
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
              groqMessages.push({ role: "assistant", content: null, tool_calls: [toolCall] });
              groqMessages.push({ role: "tool", content: `Document "${toolArgs.title}" created successfully in workspace.`, tool_call_id: toolCall.id });
              send({ type: "tool_use", tool: "create_document", title: toolArgs.title, path: "/workspace" });
            } else if (toolName === "create_project") {
              activeVerb = "creating";
              send({ type: "verb", verb: "creating" });
              const [project] = await db.insert(projectsTable).values({
                userId: session.userId,
                agentId: conv.agentId ?? undefined,
                title: toolArgs.title as string,
                subject: (toolArgs.subject as string) || agent?.subject,
                type: (toolArgs.type as string) || "general",
                status: "active",
              }).returning();
              const taskList = (toolArgs.tasks as string[]) || [];
              for (const taskTitle of taskList) {
                await db.insert(projectTasksTable).values({ projectId: project.id, title: taskTitle });
              }
              groqMessages.push({ role: "assistant", content: null, tool_calls: [toolCall] });
              groqMessages.push({ role: "tool", content: `Project "${toolArgs.title}" created with ${taskList.length} tasks.`, tool_call_id: toolCall.id });
              send({ type: "tool_use", tool: "create_project", title: toolArgs.title, path: "/projects" });
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
              groqMessages.push({ role: "assistant", content: null, tool_calls: [toolCall] });
              groqMessages.push({ role: "tool", content: `Schedule "${toolArgs.title}" saved to workspace.`, tool_call_id: toolCall.id });
              send({ type: "tool_use", tool: "plan_schedule", title: toolArgs.title, path: "/workspace" });
            }
          }

          if (toolCalls.length > 0) {
            const finalResponse = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
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
          } else {
            const textContent = choice.message.content || "";
            fullText = textContent;

            const streamResponse = await groq.chat.completions.create({
              model: "llama-3.3-70b-versatile",
              max_tokens: 4096,
              messages: [
                { role: "system", content: systemPrompt },
                ...chatMessages,
              ],
              stream: true,
            });

            fullText = "";
            for await (const chunk of streamResponse) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                send({ type: "text", text: delta });
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

          await db
            .update(creditBalancesTable)
            .set({ balance: balance.balance - COST_PER_MESSAGE, updatedAt: new Date().toISOString() })
            .where(eq(creditBalancesTable.userId, session.userId));

          await db.insert(creditTransactionsTable).values({
            userId: session.userId,
            amount: -COST_PER_MESSAGE,
            type: "usage",
            description: `AI message with agent: ${agent?.name || "General"}`,
          });

          await db
            .update(conversations)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(conversations.id, convId));

          if (agent && fullText.length > 100) {
            const existingMemory = await db
              .select()
              .from(agentMemoryTable)
              .where(and(eq(agentMemoryTable.agentId, agent.id), eq(agentMemoryTable.userId, session.userId), eq(agentMemoryTable.memoryType, "long_term")))
              .limit(1);

            if (existingMemory.length === 0) {
              await db.insert(agentMemoryTable).values({
                agentId: agent.id,
                userId: session.userId,
                memoryType: "long_term",
                content: `User asked about: ${content.trim().slice(0, 200)}`,
              });
            }
          }

          send({
            type: "done",
            userMessageId: userMsg.id,
            assistantMessageId: assistantMsg.id,
            creditsRemaining: balance.balance - COST_PER_MESSAGE,
            verb: activeVerb,
            thinkMs,
          });
        } catch (err) {
          console.error("Groq streaming error:", err);
          send({ type: "error", error: "AI error occurred. Please try again." });
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
