import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, manufacturersTable, collectionsTable, decorsTable, pricesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/catalog/import", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const regionId = parseInt(String(req.body.regionId), 10);
  if (!regionId) {
    res.status(400).json({ error: "regionId is required" });
    return;
  }

  const errors: string[] = [];
  let imported = 0;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: "Empty file" });
      return;
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const manufacturerName = String(row["Производитель"] ?? row["manufacturer"] ?? "").trim();
      const collectionName = String(row["Коллекция"] ?? row["collection"] ?? "").trim();
      const decorName = String(row["Декор"] ?? row["decor"] ?? "").trim();
      const pricePerSqm = parseFloat(String(row["Цена за м2"] ?? row["price_per_sqm"] ?? "0"));
      const pricePerHole = parseFloat(String(row["Цена за отверстие"] ?? row["price_per_hole"] ?? "0"));
      const pricePackagingPerSqm = parseFloat(String(row["Цена упаковки за м2"] ?? row["price_packaging_per_sqm"] ?? "0"));

      if (!manufacturerName || !collectionName || !decorName) {
        errors.push(`Строка ${rowNum}: пропущены обязательные поля (Производитель, Коллекция, Декор)`);
        continue;
      }
      if (isNaN(pricePerSqm) || pricePerSqm < 0) {
        errors.push(`Строка ${rowNum}: некорректная цена за м²`);
        continue;
      }

      let [manufacturer] = await db.select().from(manufacturersTable).where(eq(manufacturersTable.name, manufacturerName));
      if (!manufacturer) {
        [manufacturer] = await db.insert(manufacturersTable).values({ name: manufacturerName }).returning();
      }

      let [collection] = await db.select().from(collectionsTable).where(and(eq(collectionsTable.name, collectionName), eq(collectionsTable.manufacturerId, manufacturer.id)));
      if (!collection) {
        [collection] = await db.insert(collectionsTable).values({ name: collectionName, manufacturerId: manufacturer.id }).returning();
      }

      let [decor] = await db.select().from(decorsTable).where(and(eq(decorsTable.name, decorName), eq(decorsTable.collectionId, collection.id)));
      if (!decor) {
        [decor] = await db.insert(decorsTable).values({ name: decorName, collectionId: collection.id }).returning();
      }

      const [existingPrice] = await db.select().from(pricesTable).where(and(eq(pricesTable.regionId, regionId), eq(pricesTable.decorId, decor.id)));
      if (existingPrice) {
        await db.update(pricesTable).set({
          pricePerSqm: String(pricePerSqm),
          pricePerHole: String(pricePerHole),
          pricePackagingPerSqm: String(pricePackagingPerSqm),
        }).where(eq(pricesTable.id, existingPrice.id));
      } else {
        await db.insert(pricesTable).values({
          regionId,
          decorId: decor.id,
          pricePerSqm: String(pricePerSqm),
          pricePerHole: String(pricePerHole),
          pricePackagingPerSqm: String(pricePackagingPerSqm),
        });
      }
      imported++;
    }

    res.json({ success: true, message: `Импортировано ${imported} позиций`, imported, errors });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse file", success: false, imported: 0, errors: [String(err)] });
  }
});

export default router;
