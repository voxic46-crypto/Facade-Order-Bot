import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, pricesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/prices", async (req, res): Promise<void> => {
  const regionId = req.query.regionId ? parseInt(String(req.query.regionId), 10) : undefined;
  const decorId = req.query.decorId ? parseInt(String(req.query.decorId), 10) : undefined;

  let result;
  if (regionId && decorId) {
    result = await db.select().from(pricesTable).where(and(eq(pricesTable.regionId, regionId), eq(pricesTable.decorId, decorId)));
  } else if (regionId) {
    result = await db.select().from(pricesTable).where(eq(pricesTable.regionId, regionId));
  } else if (decorId) {
    result = await db.select().from(pricesTable).where(eq(pricesTable.decorId, decorId));
  } else {
    result = await db.select().from(pricesTable);
  }
  res.json(result);
});

router.post("/prices", async (req, res): Promise<void> => {
  const { regionId, decorId, pricePerSqm, pricePerHole, pricePackagingPerSqm } = req.body;
  if (!regionId || !decorId || !pricePerSqm) {
    res.status(400).json({ error: "regionId, decorId, pricePerSqm are required" });
    return;
  }
  const [price] = await db.insert(pricesTable).values({
    regionId,
    decorId,
    pricePerSqm: String(pricePerSqm),
    pricePerHole: String(pricePerHole ?? "0"),
    pricePackagingPerSqm: String(pricePackagingPerSqm ?? "0"),
  }).returning();
  res.status(201).json(price);
});

router.patch("/prices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { pricePerSqm, pricePerHole, pricePackagingPerSqm } = req.body;
  const updates: Record<string, string> = {};
  if (pricePerSqm !== undefined) updates.pricePerSqm = String(pricePerSqm);
  if (pricePerHole !== undefined) updates.pricePerHole = String(pricePerHole);
  if (pricePackagingPerSqm !== undefined) updates.pricePackagingPerSqm = String(pricePackagingPerSqm);

  const [price] = await db.update(pricesTable).set(updates).where(eq(pricesTable.id, id)).returning();
  if (!price) {
    res.status(404).json({ error: "Price not found" });
    return;
  }
  res.json(price);
});

router.delete("/prices/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [price] = await db.delete(pricesTable).where(eq(pricesTable.id, id)).returning();
  if (!price) {
    res.status(404).json({ error: "Price not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
