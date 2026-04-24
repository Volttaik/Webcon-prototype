import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { getPublicOrigin } from "@/lib/request-origin";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CREDIT_PACKAGES: Record<
  string,
  { credits: number; amountNgn: number; name: string }
> = {
  trial:    { credits: 10,   amountNgn: 100,   name: "Trial Pack" },
  starter:  { credits: 100,  amountNgn: 1000,  name: "Starter Pack" },
  standard: { credits: 500,  amountNgn: 4500,  name: "Standard Pack" },
  pro_pack: { credits: 1200, amountNgn: 10000, name: "Power Pack" },
  mega:     { credits: 3000, amountNgn: 22000, name: "Mega Pack" },
  student:  { credits: 300,  amountNgn: 1200,  name: "Student Pack" },
  scholar:  { credits: 700,  amountNgn: 2500,  name: "Scholar Pack" },
  champion: { credits: 2000, amountNgn: 6000,  name: "Champion Pack" },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as { packageId?: string; returnTo?: string };
    const packageId = body.packageId;
    const pkg = packageId ? CREDIT_PACKAGES[packageId] : undefined;
    if (!packageId || !pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }
    // Only allow same-origin paths to prevent open-redirect via metadata
    const safeReturnTo =
      body.returnTo && body.returnTo.startsWith("/") && !body.returnTo.startsWith("//")
        ? body.returnTo
        : "/billing";

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json(
        { error: "Payment not configured" },
        { status: 500 }
      );
    }

    const reference = `WC-${Date.now()}-${session.userId}`;
    const origin = getPublicOrigin(request);
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: pkg.amountNgn * 100,
          reference,
          callback_url: `${origin}/payment/callback?reference=${encodeURIComponent(reference)}&returnTo=${encodeURIComponent(safeReturnTo)}`,
          metadata: {
            userId: session.userId,
            packageId,
            credits: pkg.credits,
            returnTo: safeReturnTo,
            cancel_action: `${origin}/payment/callback?payment=cancelled&returnTo=${encodeURIComponent(safeReturnTo)}`,
          },
        }),
      }
    );

    const data = (await response.json()) as {
      status: boolean;
      data?: { authorization_url: string; reference: string };
    };
    if (!data.status || !data.data) {
      return NextResponse.json(
        { error: "Payment initialization failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      package: pkg,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
