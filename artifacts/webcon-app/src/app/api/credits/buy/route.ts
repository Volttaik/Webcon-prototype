import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CREDIT_PACKAGES: Record<
  string,
  { credits: number; amountNgn: number; name: string }
> = {
  starter: { credits: 100, amountNgn: 500, name: "Starter Pack" },
  student: { credits: 300, amountNgn: 1200, name: "Student Pack" },
  scholar: { credits: 700, amountNgn: 2500, name: "Scholar Pack" },
  champion: { credits: 2000, amountNgn: 6000, name: "Champion Pack" },
};

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { packageId } = await request.json();
    const pkg = CREDIT_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

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
          metadata: {
            userId: session.userId,
            packageId,
            credits: pkg.credits,
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
