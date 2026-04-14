import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { whatsappAgentCodesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const codes = await db
      .select()
      .from(whatsappAgentCodesTable)
      .where(eq(whatsappAgentCodesTable.userId, session.userId))
      .orderBy(whatsappAgentCodesTable.createdAt);

    return NextResponse.json({ codes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { agentId } = await req.json() as { agentId: number };
    if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

    const existing = await db
      .select()
      .from(whatsappAgentCodesTable)
      .where(
        and(
          eq(whatsappAgentCodesTable.userId, session.userId),
          eq(whatsappAgentCodesTable.agentId, agentId),
          eq(whatsappAgentCodesTable.used, false),
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ code: existing[0] });
    }

    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const conflict = await db
        .select({ id: whatsappAgentCodesTable.id })
        .from(whatsappAgentCodesTable)
        .where(eq(whatsappAgentCodesTable.code, code))
        .limit(1);
      if (conflict.length === 0) break;
      code = generateCode();
      attempts++;
    }

    const [inserted] = await db
      .insert(whatsappAgentCodesTable)
      .values({ code, agentId, userId: session.userId })
      .returning();

    return NextResponse.json({ code: inserted });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await db
      .delete(whatsappAgentCodesTable)
      .where(
        and(
          eq(whatsappAgentCodesTable.id, id),
          eq(whatsappAgentCodesTable.userId, session.userId),
        )
      );

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
