import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureCreditBalance } from "@/lib/auth-server";
import { sendVerificationEmail } from "../../../lib/email";
import { getSiteUrl } from "../../../lib/site-url";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, institution } =
      await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailVerifyToken = uuidv4();

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        institution: institution || null,
        emailVerified: false,
        emailVerifyToken,
      })
      .returning();

    await ensureCreditBalance(user.id);

    const siteUrl = getSiteUrl(request);

    try {
      await sendVerificationEmail(user.email, emailVerifyToken, siteUrl);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    return NextResponse.json({ needsVerification: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
