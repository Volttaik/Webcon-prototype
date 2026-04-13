import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { usersTable, sessionsTable, creditBalancesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, requireAuth, ensureCreditBalance, type AuthRequest } from "../lib/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, institution } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      institution: institution || null,
    }).returning();
    await ensureCreditBalance(user.id);
    const token = await createSession(user.id);
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        institution: user.institution,
        creditBalance: 100,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    await ensureCreditBalance(user.id);
    const balance = await db.select().from(creditBalancesTable).where(eq(creditBalancesTable.userId, user.id)).limit(1);
    const token = await createSession(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        institution: user.institution,
        creditBalance: balance[0]?.balance ?? 0,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.sessionId) {
      await db.delete(sessionsTable).where(eq(sessionsTable.id, req.sessionId));
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const balance = await db.select().from(creditBalancesTable).where(eq(creditBalancesTable.userId, user.id)).limit(1);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      institution: user.institution,
      creditBalance: balance[0]?.balance ?? 0,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, institution } = req.body;
    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (institution !== undefined) updates.institution = institution;
    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!)).returning();
    const balance = await db.select().from(creditBalancesTable).where(eq(creditBalancesTable.userId, user.id)).limit(1);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      institution: user.institution,
      creditBalance: balance[0]?.balance ?? 0,
      createdAt: user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
