import { Router } from "express";
import Groq from "groq-sdk";
import { db } from "../lib/db";
import { conversations, messages, agentsTable, creditBalancesTable, creditTransactionsTable, workspaceItemsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY env var not set");
}

const GROQ_MODEL = "llama-3.3-70b-versatile";
const COST_PER_MESSAGE = 1;

const TOOLS: Groq.Chat.CompletionCreateParams["tools"] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information. Use this for recent events, facts, or any information you're unsure about.",
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
      description: "Create and save a document (note, presentation outline, or speech) to the student's workspace.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["note", "presentation", "speech"], description: "Document type" },
          title: { type: "string", description: "Document title" },
          content: { type: "string", description: "Full document content in Markdown format" },
          subject: { type: "string", description: "Subject/topic of the document" },
        },
        required: ["type", "title", "content"],
      },
    },
  },
];

async function doWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = (await response.json()) as { AbstractText?: string; RelatedTopics?: { Text?: string }[] };
    const abstract = data.AbstractText || "";
    const related = (data.RelatedTopics || [])
      .slice(0, 3)
      .map((t) => t.Text || "")
      .filter(Boolean)
      .join("\n");
    return abstract || related || `Search results for: ${query} (no summary available)`;
  } catch {
    return `Could not fetch web results for: ${query}`;
  }
}

router.get("/chat/conversations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const agentIdParam = req.query.agentId ? parseInt(req.query.agentId as string) : undefined;
    const whereClause = agentIdParam
      ? and(eq(conversations.userId, req.userId!), eq(conversations.agentId, agentIdParam))
      : eq(conversations.userId, req.userId!);
    const convs = await db.select().from(conversations).where(whereClause).orderBy(desc(conversations.updatedAt));
    const withCounts = await Promise.all(
      convs.map(async (c) => {
        const [agent] = c.agentId
          ? await db.select().from(agentsTable).where(eq(agentsTable.id, c.agentId)).limit(1)
          : [null];
        const [msgCount] = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.conversationId, c.id));
        return {
          id: c.id,
          userId: c.userId,
          agentId: c.agentId,
          agentName: agent?.name ?? null,
          agentSubject: agent?.subject ?? null,
          title: c.title,
          messageCount: Number(msgCount?.count ?? 0),
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );
    res.json(withCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chat/conversations", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { agentId, title } = req.body;
    if (!agentId) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, agentId), eq(agentsTable.userId, req.userId!)))
      .limit(1);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    const convTitle = title || `${agent.name} — ${new Date().toLocaleDateString("en-NG")}`;
    const [conv] = await db
      .insert(conversations)
      .values({ userId: req.userId!, agentId, title: convTitle })
      .returning();
    res.status(201).json({
      id: conv.id,
      userId: conv.userId,
      agentId: conv.agentId,
      agentName: agent.name,
      agentSubject: agent.subject,
      title: conv.title,
      messageCount: 0,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/chat/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const [agent] = conv.agentId
      ? await db.select().from(agentsTable).where(eq(agentsTable.id, conv.agentId)).limit(1)
      : [null];
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json({
      id: conv.id,
      userId: conv.userId,
      agentId: conv.agentId,
      agentName: agent?.name ?? null,
      agentSubject: agent?.subject ?? null,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messages: msgs.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        verb: m.verb ?? null,
        thinkMs: m.thinkMs ?? null,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/chat/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!)));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/chat/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
    res.json(
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
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/chat/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body;
  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      res.status(503).json({ error: "AI chat is not configured. Add GROQ_API_KEY to enable chat responses." });
      return;
    }
    const groq = new Groq({ apiKey: groqApiKey });

    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, req.userId!))
      .limit(1);
    if (!balance || balance.balance < COST_PER_MESSAGE) {
      res.status(402).json({ error: "Insufficient credits" });
      return;
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, req.userId!)))
      .limit(1);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const [agent] = conv.agentId
      ? await db.select().from(agentsTable).where(eq(agentsTable.id, conv.agentId)).limit(1)
      : [null];

    const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

    const [userMsg] = await db
      .insert(messages)
      .values({ conversationId: id, role: "user", content: content.trim() })
      .returning();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (type: string, data: Record<string, unknown> = {}) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const systemPrompt = agent?.systemPrompt || "You are a helpful Nigerian student teaching assistant.";

    type GroqMessage = Groq.Chat.ChatCompletionMessageParam;
    const pendingMessages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: content.trim() },
    ];

    let fullResponse = "";
    let verb: string | null = null;
    const startMs = Date.now();
    let continueLoop = true;

    while (continueLoop) {
      const stream = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: pendingMessages,
        tools: TOOLS,
        tool_choice: "auto",
        stream: true,
        max_tokens: 4096,
      });

      let currentText = "";
      let toolCallId = "";
      let toolCallName = "";
      let toolCallArgs = "";
      let finishReason = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const reason = chunk.choices[0]?.finish_reason;
        if (reason) finishReason = reason;

        if (delta?.content) {
          currentText += delta.content;
          fullResponse += delta.content;
          sendEvent("text", { text: delta.content });
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.id) toolCallId = tc.id;
            if (tc.function?.name) {
              toolCallName = tc.function.name;
              verb = toolCallName === "web_search" ? "searching" : "creating";
              sendEvent("verb", { verb });
            }
            if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
          }
        }
      }

      if (finishReason === "tool_calls" && toolCallName) {
        let parsedArgs: Record<string, unknown> = {};
        try { parsedArgs = JSON.parse(toolCallArgs); } catch {}

        let toolResult = "";
        if (toolCallName === "web_search") {
          const query = parsedArgs.query as string;
          sendEvent("tool_use", { tool: "web_search", query });
          toolResult = await doWebSearch(query);
          verb = "searching";
        } else if (toolCallName === "create_document") {
          const { type, title, content: docContent, subject } = parsedArgs as {
            type: string; title: string; content: string; subject?: string;
          };
          sendEvent("tool_use", { tool: "create_document", title });
          try {
            await db.insert(workspaceItemsTable).values({
              userId: req.userId!,
              agentId: conv.agentId ?? undefined,
              conversationId: id,
              type,
              title,
              content: docContent,
              subject: subject || agent?.subject,
            });
            toolResult = `Successfully created ${type} titled "${title}" and saved it to your workspace.`;
            verb = "creating";
          } catch (e) {
            toolResult = `Failed to save document: ${String(e)}`;
          }
        }

        pendingMessages.push({
          role: "assistant",
          content: currentText || null,
          tool_calls: [{ id: toolCallId, type: "function", function: { name: toolCallName, arguments: toolCallArgs } }],
        });
        pendingMessages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: toolResult,
        });
      } else {
        continueLoop = false;
      }
    }

    const thinkMs = Date.now() - startMs;

    const [assistantMsg] = await db
      .insert(messages)
      .values({ conversationId: id, role: "assistant", content: fullResponse, verb, thinkMs })
      .returning();

    await db
      .update(creditBalancesTable)
      .set({ balance: balance.balance - COST_PER_MESSAGE, updatedAt: new Date() })
      .where(eq(creditBalancesTable.userId, req.userId!));
    await db.insert(creditTransactionsTable).values({
      userId: req.userId!,
      amount: -COST_PER_MESSAGE,
      type: "usage",
      description: `Chat message to ${agent?.name || "agent"}`,
    });

    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, id));

    sendEvent("done", {
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
      thinkMs,
      verb,
      creditsRemaining: balance.balance - COST_PER_MESSAGE,
    });
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`);
      res.end();
    }
  }
});

export default router;
