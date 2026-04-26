import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { agentsTable, agentFilesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id: idStr, fileId: fileIdStr } = await params;
    const agentId = parseInt(idStr);
    const fileId = parseInt(fileIdStr);
    if (!Number.isFinite(agentId) || !Number.isFinite(fileId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(and(eq(agentsTable.id, agentId), eq(agentsTable.userId, session.userId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db
      .delete(agentFilesTable)
      .where(and(eq(agentFilesTable.id, fileId), eq(agentFilesTable.agentId, agentId)));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/agents/[id]/files/[fileId] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
