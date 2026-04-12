import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (session) {
      await db
        .delete(sessionsTable)
        .where(eq(sessionsTable.id, session.sessionId));
    }
    const cookieStore = await cookies();
    cookieStore.delete("token");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
