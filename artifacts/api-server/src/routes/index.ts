import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import regionsRouter from "./regions";
import manufacturersRouter from "./manufacturers";
import collectionsRouter from "./collections";
import decorsRouter from "./decors";
import pricesRouter from "./prices";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";
import botWebhookRouter from "./botWebhook";
import invoiceSettingsRouter from "./invoiceSettings";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

// Публичные маршруты (без авторизации)
router.use(healthRouter);
router.use(authRouter);

// Все остальные маршруты — только для авторизованных
router.use(requireAuth);

router.use(regionsRouter);
router.use(manufacturersRouter);
router.use(collectionsRouter);
router.use(decorsRouter);
router.use(pricesRouter);
router.use(ordersRouter);
router.use(catalogRouter);
router.use(botWebhookRouter);
router.use(invoiceSettingsRouter);

export default router;
