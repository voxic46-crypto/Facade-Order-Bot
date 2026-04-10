import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, regionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/regions", async (_req, res): Promise<void> => {
  const regions = await db.select().from(regionsTable).orderBy(regionsTable.name);
  res.json(regions);
});

router.post("/regions", async (req, res): Promise<void> => {
  const { name, managerEmail } = req.body;
  if (!name || !managerEmail) {
    res.status(400).json({ error: "name and managerEmail are required" });
    return;
  }
  const [region] = await db.insert(regionsTable).values({ name, managerEmail }).returning();
  res.status(201).json(region);
});

router.patch("/regions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, managerEmail } = req.body;
  const [region] = await db.update(regionsTable).set({ name, managerEmail }).where(eq(regionsTable.id, id)).returning();
  if (!region) {
    res.status(404).json({ error: "Region not found" });
    return;
  }
  res.json(region);
});

router.delete("/regions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [region] = await db.delete(regionsTable).where(eq(regionsTable.id, id)).returning();
  if (!region) {
    res.status(404).json({ error: "Region not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
