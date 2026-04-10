import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const decorsTable = pgTable("decors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  collectionId: integer("collection_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDecorSchema = createInsertSchema(decorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDecor = z.infer<typeof insertDecorSchema>;
export type Decor = typeof decorsTable.$inferSelect;
