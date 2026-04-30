import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { whatsappLinksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";
import { v4 as uuidv4 } from "uuid";

const WHATSAPP_NUMBER = "2348061938576";

function generateInitCode(userId: number): string {
  return `WEBCON-${userId}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let [link] = await db
      .select()
      .from(whatsappLinksTable)
      .where(eq(whatsappLinksTable.userId, session.userId))
      .limit(1);

    if (!link) {
      const initCode = generateInitCode(session.userId);
      await db
        .insert(whatsappLinksTable)
        .values({ userId: session.userId, initCode });
      [link] = await db
        .select()
        .from(whatsappLinksTable)
        .where(eq(whatsappLinksTable.userId, session.userId))
        .limit(1);
    }

    const initMessage = `Hello! I want to connect my Fimihub account.\n\nMy activation code: ${link.initCode}`;
    return NextResponse.json({
      connected: link.connected,
      initCode: link.initCode,
      initMessage,
      whatsappLink: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(initMessage)}`,
      phoneNumber: link.phoneNumber ?? null,
      connectedAt: link.connectedAt ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await db
      .delete(whatsappLinksTable)
      .where(eq(whatsappLinksTable.userId, session.userId));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
