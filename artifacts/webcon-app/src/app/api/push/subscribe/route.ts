import { NextRequest, NextResponse } from "next/server";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys, userAgent } = body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      userAgent?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await db
      .insert(pushSubscriptionsTable)
      .values({
        userId: session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: {
          userId: session.userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent ?? null,
        },
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push/subscribe] error:", err);
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
    const endpoint = searchParams.get("endpoint");

    if (endpoint) {
      await db
        .delete(pushSubscriptionsTable)
        .where(
          sql`endpoint = ${endpoint} AND user_id = ${session.userId}`
        );
    } else {
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.userId, session.userId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[push/subscribe] DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
