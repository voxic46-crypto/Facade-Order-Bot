import { Router, type IRouter } from "express";
import healthRouter from "./health";
import regionsRouter from "./regions";
import manufacturersRouter from "./manufacturers";
import collectionsRouter from "./collections";
import decorsRouter from "./decors";
import pricesRouter from "./prices";
import ordersRouter from "./orders";
import catalogRouter from "./catalog";
import botWebhookRouter from "./botWebhook";
import invoiceSettingsRouter from "./invoiceSettings";

const router: IRouter = Router();

router.use(healthRouter);
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
