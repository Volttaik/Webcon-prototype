import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const allowed: Record<string, unknown> = {};

    if (body.firstName !== undefined) allowed.firstName = body.firstName;
    if (body.lastName !== undefined) allowed.lastName = body.lastName;
    if (body.institution !== undefined) allowed.institution = body.institution;
    if (body.avatarUrl !== undefined) allowed.avatarUrl = body.avatarUrl;
    if (body.paystackRecipientCode !== undefined) allowed.paystackRecipientCode = body.paystackRecipientCode;

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(usersTable)
      .set(allowed)
      .where(eq(usersTable.id, session.userId))
      .returning();

    return NextResponse.json({
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      institution: updated.institution,
      avatarUrl: updated.avatarUrl,
      email: updated.email,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
