import { cookies } from "next/headers";
import { db } from "@workspace/db";
import { sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  creditBalancesTable,
  usersTable,
} from "@workspace/db";

export async function getAuthUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const session = await db
    .select()
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.id, token), gt(sessionsTable.expiresAt, new Date().toISOString()))
    )
    .limit(1);

  return session[0]?.userId ?? null;
}

export async function getAuthSession(): Promise<{
  userId: number;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const session = await db
    .select()
    .from(sessionsTable)
    .where(
      and(eq(sessionsTable.id, token), gt(sessionsTable.expiresAt, new Date().toISOString()))
    )
    .limit(1);

  if (!session[0]) return null;
  return { userId: session[0].userId, sessionId: token };
}

export async function createSession(userId: number): Promise<string> {
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  return id;
}

export async function ensureCreditBalance(userId: number): Promise<void> {
  const existing = await db
    .select()
    .from(creditBalancesTable)
    .where(eq(creditBalancesTable.userId, userId))
    .limit(1);
  if (!existing[0]) {
    await db.insert(creditBalancesTable).values({ userId, balance: 100 });
  }
}

export async function getUserById(userId: number) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user ?? null;
}
