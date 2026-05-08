import { pipeline, TextStreamer, env } from "@huggingface/transformers";

env.cacheDir = "/home/runner/workspace/.model-cache";
env.allowLocalModels = false;

const MODEL_ID = "HuggingFaceTB/SmolLM2-1.7B-Instruct";
const MODEL_DTYPE = "q4";

type TextGenPipeline = Awaited<ReturnType<typeof pipeline<"text-generation">>>;

const globalForAI = globalThis as typeof globalThis & {
  _apiAiPipeline?: TextGenPipeline;
  _apiAiLoadPromise?: Promise<TextGenPipeline>;
};

async function getModel(): Promise<TextGenPipeline> {
  if (globalForAI._apiAiPipeline) return globalForAI._apiAiPipeline;
  if (globalForAI._apiAiLoadPromise) return globalForAI._apiAiLoadPromise;

  globalForAI._apiAiLoadPromise = (async () => {
    console.log("[AI] Loading SmolLM2-1.7B-Instruct (q4)…");
    const p = await pipeline("text-generation", MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: "cpu",
    });
    console.log("[AI] Model ready.");
    globalForAI._apiAiPipeline = p;
    return p;
  })();

  return globalForAI._apiAiLoadPromise;
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

function buildToolAppendix(tools: AiTool[]): string {
  if (!tools.length) return "";
  const list = tools.map(t => `• **${t.name}**: ${t.description}`).join("\n");
  return `\n\n## Tools available
To call a tool output EXACTLY this format on its own line:
<tool_call>{"name":"TOOL_NAME","arguments":{...}}</tool_call>

After a tool result, continue your full answer.

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
    const appendix = buildToolAppendix(options.tools);
    if (msgs[0]?.role === "system") {
      msgs[0] = { ...msgs[0], content: msgs[0].content + appendix };
    } else {
      msgs.unshift({ role: "system", content: "You are a helpful assistant." + appendix });
    }
  }

  let fullContent = "";

  if (options.onToken) {
    const streamer = new TextStreamer(
      (model as unknown as { tokenizer: Parameters<typeof TextStreamer>[0] }).tokenizer,
      {
        skip_prompt: true,
        callback_function: (text: string) => {
          fullContent += text;
          options.onToken!(text);
        },
      }
    );

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

export const CHAT_TOOLS: AiTool[] = [
  {
    name: "web_search",
    description: "Search the web for current information, recent events, or facts you are unsure about.",
    parameters: { query: "string" },
  },
  {
    name: "calculate",
    description: "Evaluate a math expression and return the result.",
    parameters: { expression: "string" },
  },
  {
    name: "get_datetime",
    description: "Get the current date and time.",
  },
  {
    name: "create_document",
    description: "Save a document (note, presentation, speech) to the student's workspace. Use only when explicitly asked.",
    parameters: {
      type: "note | presentation | speech",
      title: "string",
      content: "string — full markdown",
      subject: "string (optional)",
    },
  },
];
