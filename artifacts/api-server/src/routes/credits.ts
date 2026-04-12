import { Router } from "express";
import { db } from "../lib/db";
import { creditBalancesTable, creditTransactionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";

const router = Router();

const CREDIT_PACKAGES = {
  starter: { credits: 100, amountNgn: 500, name: "Starter Pack" },
  student: { credits: 300, amountNgn: 1200, name: "Student Pack" },
  scholar: { credits: 700, amountNgn: 2500, name: "Scholar Pack" },
  champion: { credits: 2000, amountNgn: 6000, name: "Champion Pack" },
};

router.get("/credits/balance", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [balance] = await db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.userId, req.userId!))
      .limit(1);
    res.json({ balance: balance?.balance ?? 0, updatedAt: balance?.updatedAt ?? new Date() });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/credits/history", requireAuth, async (req: AuthRequest, res) => {
  try {
    const txns = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, req.userId!))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(50);
    res.json(txns.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      reference: t.reference ?? null,
      createdAt: t.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/credits/buy", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { packageId, email } = req.body;
    const pkg = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
    if (!pkg) {
      res.status(400).json({ error: "Invalid package" });
      return;
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      res.status(503).json({ error: "Payment not configured. Contact support." });
      return;
    }

    const reference = `WEBCON-${req.userId}-${Date.now()}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: pkg.amountNgn * 100, // kobo
        currency: "NGN",
        reference,
        metadata: {
          userId: req.userId,
          packageId,
          credits: pkg.credits,
        },
      }),
    });

    const data = (await response.json()) as { status: boolean; data?: { authorization_url: string; reference: string } };
    if (!data.status || !data.data) {
      res.status(502).json({ error: "Payment initialization failed" });
      return;
    }

    res.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      amount: pkg.amountNgn,
      credits: pkg.credits,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/credits/verify/:reference", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reference } = req.params;
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      res.status(503).json({ error: "Payment not configured" });
      return;
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const data = (await response.json()) as {
      status: boolean;
      data?: { status: string; metadata?: { credits: number; packageId: string }; reference: string };
    };

    if (!data.status || data.data?.status !== "success") {
      res.status(402).json({ error: "Payment not successful" });
      return;
    }

    const credits = data.data.metadata?.credits || 0;
    const packageId = data.data.metadata?.packageId || "unknown";

    // Check not already credited
    const existing = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.reference, reference))
      .limit(1);
    if (!existing[0]) {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, req.userId!))
        .limit(1);
      const newBalance = (balance?.balance ?? 0) + credits;
      await db
        .insert(creditBalancesTable)
        .values({ userId: req.userId!, balance: newBalance })
        .onConflictDoUpdate({ target: creditBalancesTable.userId, set: { balance: newBalance, updatedAt: new Date() } });
      await db.insert(creditTransactionsTable).values({
        userId: req.userId!,
        amount: credits,
        type: "purchase",
        description: `Purchased ${CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]?.name || "credits"} (${credits} credits)`,
        reference,
      });
      const [updated] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, req.userId!))
        .limit(1);
      res.json({ balance: updated.balance, updatedAt: updated.updatedAt });
    } else {
      const [balance] = await db
        .select()
        .from(creditBalancesTable)
        .where(eq(creditBalancesTable.userId, req.userId!))
        .limit(1);
      res.json({ balance: balance?.balance ?? 0, updatedAt: balance?.updatedAt ?? new Date() });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
