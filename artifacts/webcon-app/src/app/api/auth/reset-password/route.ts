import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find user whose emailVerifyToken contains the uuid token with pwr: prefix
    const [user] = await db
      .select()
      .from(usersTable)
      .where(like(usersTable.emailVerifyToken, `pwr:%:${token}`))
      .limit(1);

    if (!user || !user.emailVerifyToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Validate format and expiry: pwr:{expiryMs}:{uuid}
    const parts = user.emailVerifyToken.split(":");
    if (parts.length < 3 || parts[0] !== "pwr") {
      return NextResponse.json(
        { error: "Invalid reset link" },
        { status: 400 }
      );
    }

    const expiry = parseInt(parts[1], 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const storedUuid = parts.slice(2).join(":");
    if (storedUuid !== token) {
      return NextResponse.json(
        { error: "Invalid reset link" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(usersTable)
      .set({
        passwordHash,
        emailVerifyToken: null,
        emailVerified: true,
      })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
