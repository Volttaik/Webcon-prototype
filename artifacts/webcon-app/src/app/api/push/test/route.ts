import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { sendPushToUser } from "@/lib/push-server";

export async function POST() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await sendPushToUser(session.userId, {
      title: "Fimihub notifications are on",
      body: "You'll get alerts here for credits, plan updates, and important activity.",
      url: "/",
      tag: "welcome",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[push/test] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
