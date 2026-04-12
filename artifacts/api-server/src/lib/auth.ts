import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { sessionsTable, usersTable, creditBalancesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface AuthRequest extends Request {
  userId?: number;
  sessionId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const session = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.id, token),
        gt(sessionsTable.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);

  if (!session[0]) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  req.userId = session[0].userId;
  req.sessionId = token;
  next();
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
    await db.insert(creditBalancesTable).values({ userId, balance: 50 }); // 50 free starter credits
  }
}
