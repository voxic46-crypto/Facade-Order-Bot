import { Router, type IRouter } from "express";
import { db, regionsTable, manufacturersTable, collectionsTable, decorsTable, pricesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { handleBotUpdate } from "../lib/botHandler";

const router: IRouter = Router();

router.post("/bot/webhook", async (req, res): Promise<void> => {
  const update = req.body;
  req.log.info({ updateType: update?.update_type }, "Bot webhook received");

  try {
    await handleBotUpdate(update);
  } catch (err) {
    logger.error({ err }, "Error handling bot update");
  }

  res.json({ ok: true });
});

export default router;
