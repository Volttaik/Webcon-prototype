import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendPasswordResetEmail } from "../../../lib/email";
import { getSiteUrl } from "../../../lib/site-url";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Always respond with the same message to prevent email enumeration
    const ok = NextResponse.json({ ok: true });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) return ok;

    // Reuse emailVerifyToken column with a "pwr:" prefix so we don't need a schema change.
    // Format: pwr:{expiryUnixMs}:{uuid}
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
    const uuid = uuidv4();
    const resetToken = `pwr:${expiry}:${uuid}`;

    await db
      .update(usersTable)
      .set({ emailVerifyToken: resetToken })
      .where(eq(usersTable.id, user.id));

    const siteUrl = getSiteUrl(request);
    try {
      await sendPasswordResetEmail(user.email, user.firstName, uuid, siteUrl);
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr);
    }

    return ok;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
