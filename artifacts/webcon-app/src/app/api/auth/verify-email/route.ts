import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { getSiteUrl } from "../../../lib/site-url";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?error=missing-token", request.url));
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.emailVerifyToken, token))
      .limit(1);

    if (!user) {
      return NextResponse.redirect(new URL("/?error=invalid-token", request.url));
    }

    if (user.emailVerified) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    await db
      .update(usersTable)
      .set({ emailVerified: true, emailVerifyToken: null })
      .where(eq(usersTable.id, user.id));

    const sessionToken = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set("token", sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return NextResponse.redirect(new URL("/dashboard", getSiteUrl(request)));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/?error=server-error", request.url));
  }
}
