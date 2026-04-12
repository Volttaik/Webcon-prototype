import { Router } from "express";
import { db } from "../lib/db";
import { whatsappLinksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const WHATSAPP_NUMBER = "2348061938576";

function generateInitCode(userId: number): string {
  return `WEBCON-${userId}-${uuidv4().slice(0, 8).toUpperCase()}`;
}

router.get("/whatsapp", requireAuth, async (req: AuthRequest, res) => {
  try {
    let [link] = await db.select().from(whatsappLinksTable).where(eq(whatsappLinksTable.userId, req.userId!)).limit(1);
    if (!link) {
      const initCode = generateInitCode(req.userId!);
      await db.insert(whatsappLinksTable).values({ userId: req.userId!, initCode });
      [link] = await db.select().from(whatsappLinksTable).where(eq(whatsappLinksTable.userId, req.userId!)).limit(1);
    }
    const initMessage = `Hello! I want to connect my WebCon account.\n\nMy activation code: ${link.initCode}`;
    res.json({
      connected: link.connected,
      initCode: link.initCode,
      initMessage,
      whatsappLink: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(initMessage)}`,
      phoneNumber: link.phoneNumber ?? null,
      connectedAt: link.connectedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/whatsapp", requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.delete(whatsappLinksTable).where(eq(whatsappLinksTable.userId, req.userId!));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
