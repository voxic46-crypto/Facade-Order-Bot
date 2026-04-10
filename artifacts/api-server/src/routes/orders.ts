import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, regionsTable, decorsTable, collectionsTable, manufacturersTable, pricesTable } from "@workspace/db";
import { calculateItems, generateOrderExcel, buildOrderEmailHtml } from "../lib/orderUtils";
import { sendOrderEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/orders", async (req, res): Promise<void> => {
  const regionId = req.query.regionId ? parseInt(String(req.query.regionId), 10) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  let query = db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  let result;
  if (regionId && status) {
    result = await db.select().from(ordersTable).where(and(eq(ordersTable.regionId, regionId), eq(ordersTable.status, status))).orderBy(ordersTable.createdAt);
  } else if (regionId) {
    result = await db.select().from(ordersTable).where(eq(ordersTable.regionId, regionId)).orderBy(ordersTable.createdAt);
  } else if (status) {
    result = await db.select().from(ordersTable).where(eq(ordersTable.status, status)).orderBy(ordersTable.createdAt);
  } else {
    result = await query;
  }
  res.json(result);
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id)).orderBy(orderItemsTable.rowNumber);
  res.json({ ...order, items });
});

router.post("/orders", async (req, res): Promise<void> => {
  const { regionId, decorId, customerName, customerContact, items, attachedFileUrl } = req.body;

  if (!regionId || !decorId || !customerName || !customerContact || !items || !items.length) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [region] = await db.select().from(regionsTable).where(eq(regionsTable.id, regionId));
  if (!region) {
    res.status(400).json({ error: "Region not found" });
    return;
  }

  const [decor] = await db.select().from(decorsTable).where(eq(decorsTable.id, decorId));
  if (!decor) {
    res.status(400).json({ error: "Decor not found" });
    return;
  }

  const [collection] = await db.select().from(collectionsTable).where(eq(collectionsTable.id, decor.collectionId));
  const [manufacturer] = collection ? await db.select().from(manufacturersTable).where(eq(manufacturersTable.id, collection.manufacturerId)) : [null];

  const [priceRow] = await db.select().from(pricesTable).where(and(eq(pricesTable.regionId, regionId), eq(pricesTable.decorId, decorId)));
  if (!priceRow) {
    res.status(400).json({ error: "Price not found for this region and decor" });
    return;
  }

  const pricePerSqm = parseFloat(priceRow.pricePerSqm);
  const pricePerHole = parseFloat(priceRow.pricePerHole);
  const pricePackagingPerSqm = parseFloat(priceRow.pricePackagingPerSqm);

  const { calculated, totalArea, totalFacadesCost, totalHolesCost, totalPackagingCost, totalCost } = calculateItems(
    items,
    pricePerSqm,
    pricePerHole,
    pricePackagingPerSqm,
  );

  const [order] = await db.insert(ordersTable).values({
    regionId,
    decorId,
    customerName,
    customerContact,
    totalArea: String(totalArea),
    totalFacadesCost: String(totalFacadesCost),
    totalHolesCost: String(totalHolesCost),
    totalPackagingCost: String(totalPackagingCost),
    totalCost: String(totalCost),
    attachedFileUrl: attachedFileUrl ?? null,
    status: "new",
  }).returning();

  const itemValues = calculated.map((item) => ({
    orderId: order.id,
    rowNumber: item.rowNumber,
    height: String(item.height),
    width: String(item.width),
    quantity: item.quantity,
    holes: item.holes,
    area: String(item.area),
    facadesCost: String(item.facadesCost),
    holesCost: String(item.holesCost),
    packagingCost: String(item.packagingCost),
  }));

  await db.insert(orderItemsTable).values(itemValues);

  const excelBuffer = generateOrderExcel({
    orderId: order.id,
    customerName,
    customerContact,
    regionName: region.name,
    manufacturerName: manufacturer?.name ?? "—",
    collectionName: collection?.name ?? "—",
    decorName: decor.name,
    items: calculated,
    totalArea,
    totalFacadesCost,
    totalHolesCost,
    totalPackagingCost,
    totalCost,
    createdAt: order.createdAt,
  });

  const emailHtml = buildOrderEmailHtml({
    orderId: order.id,
    customerName,
    customerContact,
    regionName: region.name,
    manufacturerName: manufacturer?.name ?? "—",
    collectionName: collection?.name ?? "—",
    decorName: decor.name,
    totalArea,
    totalFacadesCost,
    totalHolesCost,
    totalPackagingCost,
    totalCost,
    itemsCount: items.length,
    createdAt: order.createdAt,
  });

  await sendOrderEmail({
    to: region.managerEmail,
    subject: `Новый заказ фасадов #${order.id} — ${customerName}`,
    html: emailHtml,
    attachments: [
      {
        filename: `order_${order.id}.xlsx`,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });

  const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id)).orderBy(orderItemsTable.rowNumber);
  res.status(201).json({ ...order, items: orderItems });
});

export default router;
