import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable, creditBalancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const balance = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, user.id))
      .limit(1);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      institution: user.institution,
      creditBalance: balance[0]?.balance ?? 0,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { firstName, lastName, institution } = await request.json();
    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (institution !== undefined) updates.institution = institution;

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, session.userId))
      .returning();

    const balance = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, user.id))
      .limit(1);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      institution: user.institution,
      creditBalance: balance[0]?.balance ?? 0,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
