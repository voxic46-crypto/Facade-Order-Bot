import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getCredentials(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin",
  };
}

router.post("/auth/login", (req, res): void => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Необходимо указать логин и пароль" });
    return;
  }

  const creds = getCredentials();

  if (username !== creds.username || password !== creds.password) {
    logger.warn({ username }, "Failed admin login attempt");
    res.status(401).json({ error: "Неверный логин или пароль" });
    return;
  }

  req.session.adminUsername = username;
  req.session.save((err) => {
    if (err) {
      logger.error({ err }, "Session save error");
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
    logger.info({ username }, "Admin logged in");
    res.json({ ok: true, username });
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) logger.error({ err }, "Session destroy error");
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  if (req.session.adminUsername) {
    res.json({ authenticated: true, username: req.session.adminUsername });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
