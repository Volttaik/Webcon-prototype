import { pipeline, TextStreamer, env } from "@huggingface/transformers";

env.cacheDir = "/home/runner/workspace/.model-cache";
env.allowLocalModels = false;

const MODEL_ID = "HuggingFaceTB/SmolLM2-1.7B-Instruct";
const MODEL_DTYPE = "q4";

type TextGenPipeline = Awaited<ReturnType<typeof pipeline<"text-generation">>>;

const globalForAI = globalThis as typeof globalThis & {
  _aiPipeline?: TextGenPipeline;
  _aiLoadPromise?: Promise<TextGenPipeline>;
};

async function getModel(): Promise<TextGenPipeline> {
  if (globalForAI._aiPipeline) return globalForAI._aiPipeline;
  if (globalForAI._aiLoadPromise) return globalForAI._aiLoadPromise;

  globalForAI._aiLoadPromise = (async () => {
    console.log("[AI] Loading SmolLM2-1.7B-Instruct (q4)…");
    const p = await pipeline("text-generation", MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: "cpu",
    });
    console.log("[AI] Model ready.");
    globalForAI._aiPipeline = p;
    return p;
  })();

  return globalForAI._aiLoadPromise;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiCompletionResult {
  content: string;
  toolCall?: AiToolCall;
}

function buildToolSystemAppendix(tools: AiTool[]): string {
  if (!tools.length) return "";
  const list = tools
    .map(
      (t) =>
        `• **${t.name}**: ${t.description}` +
        (t.parameters
          ? `\n  Params: ${JSON.stringify(t.parameters)}`
          : "")
    )
    .join("\n");
  return `\n\n## Tools available
To call a tool, output EXACTLY this format on its own line — nothing before or after:
<tool_call>{"name":"TOOL_NAME","arguments":{...}}</tool_call>

After seeing a tool result, continue with your full answer.

Available tools:
${list}`;
}

function parseToolCall(text: string): AiToolCall | undefined {
  const m = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  if (!m) return undefined;
  try {
    const parsed = JSON.parse(m[1]) as { name: string; arguments?: Record<string, unknown> };
    return { name: parsed.name, arguments: parsed.arguments ?? {} };
  } catch {
    return undefined;
  }
}

export async function aiChat(
  messages: ChatMessage[],
  options: {
    tools?: AiTool[];
    maxTokens?: number;
    temperature?: number;
    onToken?: (token: string) => void;
  } = {}
): Promise<AiCompletionResult> {
  const model = await getModel();

  const msgs: ChatMessage[] = [...messages];
  if (options.tools?.length) {
    const appendix = buildToolSystemAppendix(options.tools);
    if (msgs[0]?.role === "system") {
      msgs[0] = { ...msgs[0], content: msgs[0].content + appendix };
    } else {
      msgs.unshift({ role: "system", content: "You are a helpful assistant." + appendix });
    }
  }

  let fullContent = "";

  if (options.onToken) {
    const streamer = new TextStreamer((model as unknown as { tokenizer: Parameters<typeof TextStreamer>[0] }).tokenizer, {
      skip_prompt: true,
      callback_function: (text: string) => {
        fullContent += text;
        options.onToken!(text);
      },
    });

    await model(msgs as Parameters<typeof model>[0], {
      max_new_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      do_sample: true,
      streamer,
    });
  } else {
    const result = await model(msgs as Parameters<typeof model>[0], {
      max_new_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
      do_sample: true,
    });

    const output = result as Array<{ generated_text: ChatMessage[] }>;
    fullContent = output[0]?.generated_text?.at(-1)?.content ?? "";
  }

  const toolCall = parseToolCall(fullContent);
  const cleanContent = fullContent
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
    .trim();

  return { content: cleanContent, toolCall };
}

export const AI_TOOLS: AiTool[] = [
  {
    name: "web_search",
    description:
      "Search the web for current information, recent events, or things you are unsure about.",
    parameters: { query: "string — concise search query" },
  },
  {
    name: "calculate",
    description:
      "Evaluate a mathematical expression and return the result. Use for arithmetic, algebra, percentages, unit conversions.",
    parameters: { expression: "string — e.g. '(3.14 * 5^2) / 2'" },
  },
  {
    name: "get_datetime",
    description: "Get the current date and time (ISO format). Use when the user asks about today's date or current time.",
  },
  {
    name: "generate_quiz",
    description:
      "Generate quiz questions on a topic. Output JSON array of {question, options, answer, explanation}.",
    parameters: {
      topic: "string",
      count: "number (default 5)",
      difficulty: "easy | medium | hard",
    },
  },
  {
    name: "create_flashcards",
    description:
      "Create a set of study flashcards. Output JSON array of {front, back}.",
    parameters: { topic: "string", count: "number (default 8)" },
  },
  {
    name: "schedule_session",
    description:
      "Add a study session to the student's calendar. Use only when they explicitly ask to book/schedule a time.",
    parameters: {
      title: "string",
      date: "ISO 8601 datetime string",
      duration: "number — minutes",
      subject: "string",
      type: "study | practice | review | exam_prep | project | reading",
      notes: "string (optional)",
    },
  },
  {
    name: "create_document",
    description:
      "Save a document (note, study guide, summary, essay, plan, report) to the student's workspace. Use only when they explicitly ask to save/create/write something.",
    parameters: {
      type: "note | presentation | speech | plan | report",
      title: "string",
      content: "string — full markdown content",
      subject: "string (optional)",
    },
  },
  {
    name: "create_project",
    description:
      "Create a multi-task project. Use only when they explicitly ask for a project.",
    parameters: {
      title: "string",
      subject: "string",
      type: "study | research | assignment | general",
      tasks: "string[]",
    },
  },
  {
    name: "plan_schedule",
    description:
      "Save a written study plan as a document. Use only when they explicitly ask for a study plan document.",
    parameters: { title: "string", content: "string", subject: "string" },
  },
];
