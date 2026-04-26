import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { agentsTable, agentFilesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_CONTENT_CHARS = 60_000; // ~12k tokens hard cap per file
const MAX_FILES_PER_AGENT = 10;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Import the inner module directly to avoid pdf-parse's debug-mode test-file read
    // @ts-expect-error -- pdf-parse subpath has no type declarations
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = (mod as { default: (b: Buffer) => Promise<{ text: string }> }).default;
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch (err) {
    console.error("PDF parse error:", err);
    throw new Error("Failed to read PDF — the file may be scanned, password-protected, or corrupted.");
  }
}

async function ownsAgent(agentId: number, userId: number): Promise<boolean> {
  const [a] = await db
    .select()
    .from(agentsTable)
    .where(and(eq(agentsTable.id, agentId), eq(agentsTable.userId, userId)))
    .limit(1);
  return !!a;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id: idStr } = await params;
    const agentId = parseInt(idStr);
    if (!Number.isFinite(agentId)) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    if (!(await ownsAgent(agentId, session.userId))) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const files = await db
      .select({
        id: agentFilesTable.id,
        title: agentFilesTable.title,
        fileType: agentFilesTable.fileType,
        wordCount: agentFilesTable.wordCount,
        createdAt: agentFilesTable.createdAt,
      })
      .from(agentFilesTable)
      .where(eq(agentFilesTable.agentId, agentId))
      .orderBy(agentFilesTable.createdAt);

    return NextResponse.json(files);
  } catch (err) {
    console.error("GET /api/agents/[id]/files error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id: idStr } = await params;
    const agentId = parseInt(idStr);
    if (!Number.isFinite(agentId)) {
      return NextResponse.json({ error: "Invalid agent id" }, { status: 400 });
    }
    if (!(await ownsAgent(agentId, session.userId))) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const existingCount = (await db
      .select({ id: agentFilesTable.id })
      .from(agentFilesTable)
      .where(eq(agentFilesTable.agentId, agentId))).length;

    if (existingCount >= MAX_FILES_PER_AGENT) {
      return NextResponse.json(
        { error: `This agent already has the maximum of ${MAX_FILES_PER_AGENT} knowledge files. Delete one to add more.` },
        { status: 400 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let title = "";
    let content = "";
    let fileType = "text";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const titleField = (formData.get("title") as string | null) || "";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File too large. Max 8MB." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        content = await extractPdfText(buffer);
        fileType = "pdf";
      } else if (
        file.type.startsWith("text/") ||
        file.name.toLowerCase().match(/\.(txt|md|markdown|csv|json)$/)
      ) {
        content = buffer.toString("utf-8");
        fileType = "text";
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Upload a PDF, TXT, or Markdown file." },
          { status: 400 }
        );
      }

      title = titleField.trim() || file.name.replace(/\.[^.]+$/, "").trim();
    } else {
      const body = await req.json();
      title = String(body.title || "").trim();
      content = String(body.content || "").trim();
      fileType = "text";
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!content || content.length < 30) {
      return NextResponse.json(
        { error: "We could not extract any meaningful text. Try a different file." },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_CHARS) {
      content = content.slice(0, MAX_CONTENT_CHARS);
    }

    const wordCount = countWords(content);

    const [file] = await db
      .insert(agentFilesTable)
      .values({
        agentId,
        userId: session.userId,
        title: title.slice(0, 200),
        content,
        fileType,
        wordCount,
      })
      .returning();

    return NextResponse.json(
      {
        id: file.id,
        title: file.title,
        fileType: file.fileType,
        wordCount: file.wordCount,
        createdAt: file.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/agents/[id]/files error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
