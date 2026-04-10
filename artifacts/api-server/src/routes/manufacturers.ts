import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, manufacturersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/manufacturers", async (_req, res): Promise<void> => {
  const manufacturers = await db.select().from(manufacturersTable).orderBy(manufacturersTable.name);
  res.json(manufacturers);
});

router.post("/manufacturers", async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [manufacturer] = await db.insert(manufacturersTable).values({ name }).returning();
  res.status(201).json(manufacturer);
});

router.delete("/manufacturers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [manufacturer] = await db.delete(manufacturersTable).where(eq(manufacturersTable.id, id)).returning();
  if (!manufacturer) {
    res.status(404).json({ error: "Manufacturer not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
