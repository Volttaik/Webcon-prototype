import { NextRequest, NextResponse } from "next/server";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const items = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, session.userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit);

    const unreadCount = items.filter((n) => !n.read).length;

    return NextResponse.json({ items, unreadCount });
  } catch (err) {
    console.error("[notifications] GET error:", err);
    return NextResponse.json({ items: [], unreadCount: 0 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, all } = body as { id?: number; all?: boolean };

    if (all) {
      await db
        .update(notificationsTable)
        .set({ read: true })
        .where(eq(notificationsTable.userId, session.userId));
    } else if (id) {
      await db
        .update(notificationsTable)
        .set({ read: true })
        .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, session.userId)));
    } else {
      return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications] PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      await db
        .delete(notificationsTable)
        .where(eq(notificationsTable.userId, session.userId));
    } else if (idParam) {
      const id = Number(idParam);
      await db
        .delete(notificationsTable)
        .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, session.userId)));
    } else {
      return NextResponse.json({ error: "Missing id or all flag" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[notifications] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
