import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, decorsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/decors", async (req, res): Promise<void> => {
  const collectionId = req.query.collectionId ? parseInt(String(req.query.collectionId), 10) : undefined;
  if (collectionId) {
    const result = await db.select().from(decorsTable).where(eq(decorsTable.collectionId, collectionId)).orderBy(decorsTable.name);
    res.json(result);
    return;
  }
  const result = await db.select().from(decorsTable).orderBy(decorsTable.name);
  res.json(result);
});

export default router;
