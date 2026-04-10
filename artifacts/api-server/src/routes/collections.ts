import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, collectionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/collections", async (req, res): Promise<void> => {
  const manufacturerId = req.query.manufacturerId ? parseInt(String(req.query.manufacturerId), 10) : undefined;
  const query = db.select().from(collectionsTable).orderBy(collectionsTable.name);
  if (manufacturerId) {
    const result = await db.select().from(collectionsTable).where(eq(collectionsTable.manufacturerId, manufacturerId)).orderBy(collectionsTable.name);
    res.json(result);
    return;
  }
  const result = await query;
  res.json(result);
});

export default router;
