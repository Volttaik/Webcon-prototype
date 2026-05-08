import { NextRequest, NextResponse } from "next/server";
import { aiChat, AI_TOOLS, type ChatMessage } from "@/lib/ai-service";
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
import { eq, and, desc, sql, like } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const COST_PER_MESSAGE = 1;

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
    return `You are EduBridge, a sharp, friendly study companion. Today is ${todayIso}. Be concise, structured, and explain reasoning step-by-step. Use markdown for clarity. ${hasImage ? "The user has attached an image — analyze it based on any description or context provided." : ""}`;
  }

  const soulSection =
    agent.soulMd ||
    (agent.personalityDescription ? `Personality: ${agent.personalityDescription}` : "");
  const base =
    agent.systemPrompt ||
    `You are ${agent.name}, an expert AI study agent specializing in ${agent.subject} for a ${agent.level}-level student. Your tone: ${agent.tone}.`;

  const soulBlock = soulSection ? `\n\n## Personality\n${soulSection}` : "";
  const memoryBlock = memory ? `\n\n## What you remember about this student\n${memory}` : "";
  const hubBlock = hubContext
    ? `\n\n## Knowledge base (cite when relevant)\nYou have access to the following course materials. Quote and reference them when answering:\n\n${hubContext}`
    : "";
  const agentFilesBlock = agentFilesContext
    ? `\n\n## Personal study materials uploaded by the student to this agent\nThese are the student's own course documents. Treat them as the authoritative source. Cite the document title when you use them.\n\n${agentFilesContext}`
    : "";

  const principles = `\n\n## How you respond
- Today's date is ${todayIso}.
- Be precise and pedagogical — explain *why*, not just *what*.
- Use markdown: short paragraphs, bullets, **bold** key terms, and fenced code blocks for code or math.
- For math, use LaTeX inside $$ ... $$ for displayed equations and $ ... $ inline.
- When the student is stuck, scaffold: ask one clarifying question, then teach.
- Always search the web or knowledge bases before saying you don't know something.
- Stay grounded in ${agent.subject}. If asked off-topic, briefly help, then bring focus back.`;

  const visionBlock = hasImage
    ? `\n\n## Image attached\nThe student has attached an image. Analyze the context carefully and engage with it fully.`
    : "";

  const toolGuidance = `\n\n## Tool usage rules (critical)
- Default behaviour is plain conversation. Just answer.
- Use **web_search** for current events, recent news, anything you are unsure about — always search before saying you don't know.
- Use **fetch_webpage** after web_search to read full content of a specific result URL.
- Use **search_wikipedia** for definitions, concepts, history, science — encyclopaedic knowledge.
- Use **search_arxiv** for academic papers, research topics, cutting-edge science.
- Use **search_openlibrary** when the student asks about books, textbooks, or reading material.
- Use **calculate** for any math computation — never do it in your head.
- Use **get_datetime** only when the user asks for the current date/time.
- Use **query_student_data** when the student asks about their own schedule, documents, projects, or credits.
- Use **generate_quiz** when user asks for quiz questions on a topic.
- Use **create_flashcards** when user asks for flashcards.
- Use **schedule_session** ONLY when user explicitly asks to book/schedule a time.
- Use **create_document** ONLY when user explicitly asks to save/write/create a note or document.
- Use **create_project** ONLY when user explicitly asks for a multi-step project.
- Use **plan_schedule** ONLY when user explicitly asks for a written study plan document.
- Greetings, explanations, summaries shown inline — NEVER need a tool.`;

  return `${base}${soulBlock}${memoryBlock}${hubBlock}${agentFilesBlock}${principles}${visionBlock}${toolGuidance}`;
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function doWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
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
      if (data.AbstractURL && data.AbstractSource)
        lines.push(`Source: ${data.AbstractSource} — ${data.AbstractURL}`);
    }

    const flatTopics: Array<{ Text?: string; FirstURL?: string }> = [];
    for (const item of data.RelatedTopics || []) {
      if ((item as { Topics?: unknown[] }).Topics)
        flatTopics.push(...((item as { Topics: Array<{ Text?: string; FirstURL?: string }> }).Topics));
      else flatTopics.push(item as { Text?: string; FirstURL?: string });
    }

    if (data.Results?.length) {
      lines.push("\n## Top results");
      data.Results.slice(0, 5).forEach((r, i) => {
        if (r.Text) lines.push(`${i + 1}. ${r.Text}${r.FirstURL ? ` (${r.FirstURL})` : ""}`);
      });
    }

    if (flatTopics.length) {
      lines.push("\n## Related");
      flatTopics.filter(t => t.Text).slice(0, 5).forEach((t, i) => {
        lines.push(`${i + 1}. ${t.Text}${t.FirstURL ? ` (${t.FirstURL})` : ""}`);
      });
    }

    if (!lines.length)
      return `No structured results for "${query}". Try search_wikipedia or use general knowledge.`;
    return lines.join("\n");
  } catch {
    return `Web search failed for "${query}". Try search_wikipedia instead.`;
  }
}

async function doFetchWebpage(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "EduBridge/1.0 (educational assistant)" },
    });
    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 6000);
    return text || "Could not extract readable content from this page.";
  } catch {
    return `Could not fetch ${url}. It may be blocked or unavailable.`;
  }
}

async function doSearchWikipedia(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
    };

    const results = searchData.query?.search ?? [];
    if (!results.length) return `No Wikipedia results for "${query}".`;

    const summaries: string[] = [];
    for (const r of results.slice(0, 2)) {
      try {
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(r.title)}`;
        const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(6000) });
        const s = (await summaryRes.json()) as { extract?: string; content_urls?: { desktop?: { page?: string } } };
        const excerpt = s.extract?.slice(0, 1200) ?? r.snippet.replace(/<[^>]+>/g, "");
        summaries.push(`## ${r.title}\n${excerpt}\nSource: ${s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`}`);
      } catch {
        summaries.push(`## ${r.title}\n${r.snippet.replace(/<[^>]+>/g, "")}`);
      }
    }

    return summaries.join("\n\n---\n\n");
  } catch {
    return `Wikipedia search failed for "${query}".`;
  }
}

async function doSearchArxiv(query: string, maxResults = 5): Promise<string> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=relevance`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const xml = await res.text();

    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
    if (!entries.length) return `No arXiv papers found for "${query}".`;

    const papers = entries.slice(0, maxResults).map((e) => {
      const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\n/g, " ") ?? "Unknown";
      const summary = e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\n/g, " ").slice(0, 400) ?? "";
      const published = e.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.slice(0, 10) ?? "";
      const idRaw = e.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? "";
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map(m => m[1]).join(", ");
      return `**${title}** (${published})\nAuthors: ${authors}\n${summary}\nLink: ${idRaw.replace("http://", "https://")}`;
    });

    return `## arXiv results for "${query}"\n\n${papers.join("\n\n---\n\n")}`;
  } catch {
    return `arXiv search failed for "${query}".`;
  }
}

async function doSearchOpenLibrary(query: string, limit = 5): Promise<string> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=title,author_name,first_publish_year,subject,number_of_pages_median,key`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as {
      docs?: Array<{
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        subject?: string[];
        number_of_pages_median?: number;
        key?: string;
      }>;
    };

    const docs = data.docs ?? [];
    if (!docs.length) return `No books found on Open Library for "${query}".`;

    const books = docs.slice(0, limit).map((d, i) => {
      const title = d.title ?? "Unknown";
      const authors = d.author_name?.slice(0, 3).join(", ") ?? "Unknown author";
      const year = d.first_publish_year ?? "?";
      const pages = d.number_of_pages_median ? ` · ${d.number_of_pages_median} pages` : "";
      const subjects = d.subject?.slice(0, 3).join(", ") ?? "";
      const link = d.key ? `https://openlibrary.org${d.key}` : "";
      return `${i + 1}. **${title}** by ${authors} (${year})${pages}${subjects ? `\n   Topics: ${subjects}` : ""}${link ? `\n   ${link}` : ""}`;
    });

    return `## Books on Open Library for "${query}"\n\n${books.join("\n\n")}`;
  } catch {
    return `Open Library search failed for "${query}".`;
  }
}

function doCalculate(expression: string): string {
  try {
    const safe = expression.replace(/[^0-9+\-*/().,%^e\s]/gi, "");
    const result = Function(`"use strict"; return (${safe})`)();
    return `${expression} = ${result}`;
  } catch {
    return `Could not evaluate: ${expression}`;
  }
}

async function doQueryStudentData(
  type: string,
  filter: string | undefined,
  userId: number
): Promise<string> {
  try {
    if (type === "schedule") {
      const rows = await db
        .select()
        .from(scheduleSessionsTable)
        .where(eq(scheduleSessionsTable.userId, userId))
        .orderBy(scheduleSessionsTable.date)
        .limit(20);
      if (!rows.length) return "No scheduled sessions found.";
      const filtered = filter
        ? rows.filter(r => r.title?.toLowerCase().includes(filter.toLowerCase()) || r.subject?.toLowerCase().includes(filter.toLowerCase()))
        : rows;
      return filtered.map(r => `• ${r.title} — ${r.subject ?? ""} — ${new Date(r.date).toLocaleString()} (${r.duration}min, ${r.type})`).join("\n");
    }

    if (type === "workspace") {
      const rows = await db
        .select()
        .from(workspaceItemsTable)
        .where(eq(workspaceItemsTable.userId, userId))
        .orderBy(desc(workspaceItemsTable.createdAt))
        .limit(20);
      if (!rows.length) return "No workspace documents found.";
      const filtered = filter
        ? rows.filter(r => r.title?.toLowerCase().includes(filter.toLowerCase()))
        : rows;
      return filtered.map(r => `• [${r.type}] ${r.title} — ${r.subject ?? ""} (${new Date(r.createdAt!).toLocaleDateString()})`).join("\n");
    }

    if (type === "projects") {
      const rows = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.userId, userId))
        .orderBy(desc(projectsTable.createdAt))
        .limit(20);
      if (!rows.length) return "No projects found.";
      const filtered = filter
        ? rows.filter(r => r.title?.toLowerCase().includes(filter.toLowerCase()))
        : rows;
      return filtered.map(r => `• ${r.title} — ${r.subject ?? ""} (${r.status}, ${r.type})`).join("\n");
    }

    if (type === "agents") {
      const rows = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.userId, userId))
        .limit(20);
      if (!rows.length) return "No agents found.";
      return rows.map(r => `• ${r.name} — ${r.subject} (${r.level}, tone: ${r.tone})`).join("\n");
    }

    if (type === "credits") {
      const [bal] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, userId))
        .limit(1);
      return bal ? `Credit balance: ${bal.balance} credits` : "No credit balance found.";
    }

    return `Unknown data type: ${type}`;
  } catch (err) {
    return `Could not query student data: ${String(err)}`;
  }
}

function detectVerbFromMessage(content: string, hasImage: boolean): string {
  if (hasImage) return "looking";
  const t = content.trim().toLowerCase();
  if (/schedul|plan.*(session|study|tomorrow|today|next week)|book.*time/i.test(t)) return "planning";
  if (/create\s+(a\s+)?project|new project|organize/i.test(t)) return "creating";
  if (/create\s+(a\s+)?(file|note|document|doc|plan|study guide|summary)/i.test(t)) return "creating";
  if (/search|find|look up|latest|news|current|who is|what happened/i.test(t)) return "searching";
  if (/quiz|flashcard|test me/i.test(t)) return "thinking";
  if (/explain|what is|how does|why|when did|where is/i.test(t)) return "thinking";
  return "thinking";
}

// ── Route handlers ────────────────────────────────────────────────────────────

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
      msgs.map(m => ({
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
      return NextResponse.json({ error: "Message content or image required" }, { status: 400 });
    }

    const [agent] = conv.agentId
      ? await db.select().from(agentsTable).where(eq(agentsTable.id, conv.agentId)).limit(1)
      : [null];

    let hubContext = "";
    if (agent?.learningHubId) {
      const hubFiles = await db
        .select()
        .from(hubFilesTable)
        .where(eq(hubFilesTable.hubId, agent.learningHubId))
        .limit(10);
      if (hubFiles.length) {
        hubContext = hubFiles.map(f => `### ${f.title}\n${f.content}`).join("\n\n---\n\n");
      }
    }

    let agentFilesContext = "";
    if (agent) {
      const agentFiles = await db
        .select()
        .from(agentFilesTable)
        .where(eq(agentFilesTable.agentId, agent.id))
        .orderBy(agentFilesTable.createdAt);
      if (agentFiles.length) {
        const MAX_TOTAL = 50_000;
        let used = 0;
        const chunks: string[] = [];
        for (const f of agentFiles) {
          const remaining = MAX_TOTAL - used;
          if (remaining <= 200) break;
          const body = f.content.length > remaining
            ? f.content.slice(0, remaining) + "\n…[truncated]"
            : f.content;
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
          .where(and(eq(agentMemoryTable.agentId, agent.id), eq(agentMemoryTable.userId, session.userId)))
          .orderBy(desc(agentMemoryTable.updatedAt))
          .limit(15)
      : [];

    const memoryContext = memoryRows.map(m => m.content).join("\n");
    const userMessageContent = content.trim() || (imageUrl ? "[Image attached — please analyze]" : "");

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

    const trimmed = history
      .filter(m => m.role === "user" || m.role === "assistant")
      .slice(-20);

    const chatMessages: ChatMessage[] = trimmed.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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

          const aiMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ];

          // Multi-step tool-calling loop — up to 5 rounds for deep research
          let loopMessages = [...aiMessages];
          let continueLoop = true;
          let loopCount = 0;

          while (continueLoop && loopCount < 5) {
            loopCount++;
            const isLastLoop = loopCount >= 5;

            if (loopCount === 1 || loopCount < 5) {
              const result = await aiChat(loopMessages, {
                tools: isLastLoop ? [] : AI_TOOLS,
                maxTokens: 2048,
                temperature: 0.7,
              });

              if (result.toolCall && !isLastLoop) {
                const { name: toolName, arguments: toolArgs } = result.toolCall;
                let toolResult = "";

                // ── Web & internet tools ──────────────────────────────────
                if (toolName === "web_search") {
                  activeVerb = "searching";
                  send({ type: "verb", verb: "searching" });
                  send({ type: "tool_use", tool: "web_search", query: toolArgs.query });
                  toolResult = await doWebSearch(toolArgs.query as string);

                } else if (toolName === "fetch_webpage") {
                  activeVerb = "reading";
                  send({ type: "verb", verb: "reading" });
                  send({ type: "tool_use", tool: "fetch_webpage", url: toolArgs.url, reason: toolArgs.reason });
                  toolResult = await doFetchWebpage(toolArgs.url as string);

                // ── Knowledge base tools ──────────────────────────────────
                } else if (toolName === "search_wikipedia") {
                  activeVerb = "searching";
                  send({ type: "verb", verb: "searching" });
                  send({ type: "tool_use", tool: "search_wikipedia", query: toolArgs.query });
                  toolResult = await doSearchWikipedia(toolArgs.query as string);

                } else if (toolName === "search_arxiv") {
                  activeVerb = "searching";
                  send({ type: "verb", verb: "searching" });
                  send({ type: "tool_use", tool: "search_arxiv", query: toolArgs.query });
                  toolResult = await doSearchArxiv(
                    toolArgs.query as string,
                    (toolArgs.max_results as number) ?? 5
                  );

                } else if (toolName === "search_openlibrary") {
                  activeVerb = "searching";
                  send({ type: "verb", verb: "searching" });
                  send({ type: "tool_use", tool: "search_openlibrary", query: toolArgs.query });
                  toolResult = await doSearchOpenLibrary(
                    toolArgs.query as string,
                    (toolArgs.limit as number) ?? 5
                  );

                // ── Student data tool ─────────────────────────────────────
                } else if (toolName === "query_student_data") {
                  activeVerb = "thinking";
                  send({ type: "verb", verb: "thinking" });
                  toolResult = await doQueryStudentData(
                    toolArgs.type as string,
                    toolArgs.filter as string | undefined,
                    session.userId
                  );

                // ── Utility tools ─────────────────────────────────────────
                } else if (toolName === "calculate") {
                  send({ type: "verb", verb: "thinking" });
                  toolResult = doCalculate(toolArgs.expression as string);

                } else if (toolName === "get_datetime") {
                  toolResult = new Date().toISOString();

                // ── Scheduling & workspace tools ──────────────────────────
                } else if (toolName === "schedule_session") {
                  activeVerb = "planning";
                  send({ type: "verb", verb: "planning" });
                  try {
                    const parsedDate = new Date(toolArgs.date as string);
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
                    toolResult = `Session scheduled for ${parsedDate.toLocaleString()}: "${scheduleSession.title}". Visible on the Schedule page.`;
                    send({ type: "tool_use", tool: "schedule_session", title: scheduleSession.title, path: "/schedule" });
                  } catch {
                    toolResult = "Failed to schedule session — invalid date.";
                  }

                } else if (toolName === "create_document" || toolName === "plan_schedule") {
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
                  toolResult = `Document "${toolArgs.title}" saved to workspace.`;
                  send({ type: "tool_use", tool: "create_document", title: toolArgs.title, path: "/workspace" });

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
                    await db.insert(projectTasksTable).values({ projectId: project.id, title: taskTitle });
                  }
                  toolResult = `Project "${toolArgs.title}" created with ${taskList.length} tasks.`;
                  send({ type: "tool_use", tool: "create_project", title: toolArgs.title, path: "/projects" });

                } else if (toolName === "generate_quiz" || toolName === "create_flashcards") {
                  activeVerb = "thinking";
                  send({ type: "verb", verb: "thinking" });
                  toolResult = `Generate ${toolName === "generate_quiz" ? "quiz questions" : "flashcards"} for topic: ${toolArgs.topic}. Count: ${toolArgs.count || (toolName === "generate_quiz" ? 5 : 8)}. Format as JSON array.`;
                }

                // Feed tool result back and continue the loop
                loopMessages = [
                  ...loopMessages,
                  { role: "assistant" as const, content: result.content || "" },
                  { role: "user" as const, content: `[Tool: ${toolName}] Result:\n${toolResult}` },
                ];

              } else {
                // No tool call — stream the final response
                fullText = "";
                send({ type: "verb", verb: activeVerb });

                await aiChat(loopMessages, {
                  maxTokens: 2048,
                  temperature: 0.7,
                  onToken: (token) => {
                    fullText += token;
                    send({ type: "text", text: token });
                  },
                });

                continueLoop = false;
              }
            }
          }

          const thinkMs = Date.now() - startTime;

          const [assistantMsg] = await db
            .insert(messages)
            .values({
              conversationId: convId,
              role: "assistant",
              content: fullText,
              verb: activeVerb,
              thinkMs,
            })
            .returning();

          if (!isCreatorPlan) {
            await db
              .update(creditBalancesTable)
              .set({ balance: balance.balance - COST_PER_MESSAGE, updatedAt: new Date().toISOString() })
              .where(eq(creditBalancesTable.userId, session.userId));
            await db.insert(creditTransactionsTable).values({
              userId: session.userId,
              amount: -COST_PER_MESSAGE,
              type: "usage",
              description: `Chat message to ${agent?.name || "agent"}`,
            });
          }

          await db
            .update(conversations)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(conversations.id, convId));

          send({
            type: "done",
            userMessageId: userMsg.id,
            assistantMessageId: assistantMsg.id,
            thinkMs,
            verb: activeVerb,
            creditsRemaining: isCreatorPlan ? 9999 : (balance.balance - COST_PER_MESSAGE),
          });
        } catch (err) {
          console.error("[chat route]", err);
          send({ type: "error", error: String(err) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
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
