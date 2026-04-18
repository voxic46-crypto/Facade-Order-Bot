import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import { handleBotUpdate } from "../lib/botHandler";

const router: IRouter = Router();

// Telegram webhook — принимает обновления от Telegram
router.post("/bot/webhook", async (req, res): Promise<void> => {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secretToken) {
    const headerToken = req.headers["x-telegram-bot-api-secret-token"];
    if (headerToken !== secretToken) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const update = req.body;
  req.log?.info({ update_id: update?.update_id }, "Telegram webhook received");

  try {
    await handleBotUpdate(update);
  } catch (err) {
    logger.error({ err }, "Error handling Telegram update");
  }

  res.json({ ok: true });
});

// Вспомогательный маршрут: регистрация вебхука у Telegram
router.post("/bot/set-webhook", async (req, res): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(400).json({ error: "TELEGRAM_BOT_TOKEN not set" });
    return;
  }

  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url required in body" });
    return;
  }

  const body: Record<string, string> = { url };
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) body.secret_token = secret;

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    logger.error({ err }, "Failed to set Telegram webhook");
    res.status(500).json({ error: "Failed to set webhook" });
  }
});

// Вспомогательный маршрут: проверка статуса вебхука
router.get("/bot/webhook-info", async (req, res): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(400).json({ error: "TELEGRAM_BOT_TOKEN not set" });
    return;
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to get webhook info" });
  }
});

export default router;
