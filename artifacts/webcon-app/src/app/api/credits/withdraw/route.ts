import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, getUserById } from "@/lib/auth-server";
import { sendWithdrawalEmail } from "@/app/lib/email";
import { v4 as uuidv4 } from "uuid";

const MIN_WITHDRAWAL = 1000;

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json() as { amount?: unknown };
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reference = `WDR-${uuidv4().split("-")[0].toUpperCase()}-${Date.now()}`;

    try {
      await sendWithdrawalEmail(user.email, user.firstName, amount, reference);
    } catch (emailErr) {
      console.error("Failed to send withdrawal email:", emailErr);
    }

    return NextResponse.json({ ok: true, reference });
  } catch (err) {
    console.error("[withdraw] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
