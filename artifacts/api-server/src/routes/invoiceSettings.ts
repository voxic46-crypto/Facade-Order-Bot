import { Router, type IRouter } from "express";
import { db, invoiceSettingsTable, ordersTable, orderItemsTable, decorsTable, collectionsTable, manufacturersTable, regionsTable, pricesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { buildInvoiceNumber, generateInvoiceExcel, type InvoiceSettingsData } from "../lib/invoiceUtils";

const router: IRouter = Router();

// GET /api/invoice-settings — получить реквизиты (или пустой объект)
router.get("/invoice-settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(invoiceSettingsTable).limit(1);
  if (rows.length === 0) {
    // Создаём запись с дефолтными значениями
    const [created] = await db.insert(invoiceSettingsTable).values({}).returning();
    res.json(created);
    return;
  }
  res.json(rows[0]);
});

// PUT /api/invoice-settings — обновить реквизиты
router.put("/invoice-settings", async (req, res): Promise<void> => {
  const {
    supplierName, supplierInn, supplierKpp, supplierAddress,
    supplierPhone, supplierEmail, bankName, bankAccount,
    bankBic, bankCorrespondentAccount, invoicePrefix,
  } = req.body;

  const rows = await db.select().from(invoiceSettingsTable).limit(1);

  const values = {
    supplierName: supplierName ?? "",
    supplierInn: supplierInn ?? "",
    supplierKpp: supplierKpp ?? "",
    supplierAddress: supplierAddress ?? "",
    supplierPhone: supplierPhone ?? "",
    supplierEmail: supplierEmail ?? "",
    bankName: bankName ?? "",
    bankAccount: bankAccount ?? "",
    bankBic: bankBic ?? "",
    bankCorrespondentAccount: bankCorrespondentAccount ?? "",
    invoicePrefix: invoicePrefix ?? "СЧ-",
  };

  let result;
  if (rows.length === 0) {
    [result] = await db.insert(invoiceSettingsTable).values(values).returning();
  } else {
    [result] = await db.update(invoiceSettingsTable).set(values).where(eq(invoiceSettingsTable.id, rows[0].id)).returning();
  }

  res.json(result);
});

// GET /api/orders/:id/invoice — скачать счёт в Excel
router.get("/orders/:id/invoice", async (req, res): Promise<void> => {
  const orderId = parseInt(String(req.params.id), 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId)).orderBy(orderItemsTable.rowNumber);
  const [decor] = await db.select().from(decorsTable).where(eq(decorsTable.id, order.decorId));
  const [collection] = decor ? await db.select().from(collectionsTable).where(eq(collectionsTable.id, decor.collectionId)) : [null];
  const [manufacturer] = collection ? await db.select().from(manufacturersTable).where(eq(manufacturersTable.id, collection.manufacturerId)) : [null];
  const [priceRow] = await db.select().from(pricesTable)
    .where(eq(pricesTable.decorId, order.decorId))
    .limit(1);
  const pricePerSqm = priceRow ? parseFloat(priceRow.pricePerSqm) : 0;

  const settingsRows = await db.select().from(invoiceSettingsTable).limit(1);
  const settings: InvoiceSettingsData = settingsRows[0] ?? {
    supplierName: "", supplierInn: "", supplierKpp: "", supplierAddress: "",
    supplierPhone: "", supplierEmail: "", bankName: "", bankAccount: "",
    bankBic: "", bankCorrespondentAccount: "", invoicePrefix: "СЧ-",
  };

  const invoiceNumber = order.invoiceNumber ?? buildInvoiceNumber(settings.invoicePrefix, order.id, order.createdAt);

  const calculatedItems = items.map((it) => ({
    rowNumber: it.rowNumber,
    height: parseFloat(it.height),
    width: parseFloat(it.width),
    quantity: it.quantity,
    holes: it.holes,
    area: parseFloat(it.area),
    facadesCost: parseFloat(it.facadesCost),
    holesCost: parseFloat(it.holesCost),
    packagingCost: parseFloat(it.packagingCost),
  }));

  const excelBuffer = generateInvoiceExcel({
    invoiceNumber,
    invoiceDate: order.createdAt,
    settings,
    customerName: order.customerName,
    customerContact: order.customerContact,
    decorName: decor?.name ?? "—",
    collectionName: collection?.name ?? "—",
    manufacturerName: manufacturer?.name ?? "—",
    pricePerSqm,
    items: calculatedItems,
    totalFacadesCost: parseFloat(order.totalFacadesCost),
    totalHolesCost: parseFloat(order.totalHolesCost),
    totalPackagingCost: parseFloat(order.totalPackagingCost),
    totalCost: parseFloat(order.totalCost),
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="invoice_${invoiceNumber}.xlsx"`);
  res.send(excelBuffer);
});

export default router;
