import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pricesTable = pgTable("prices", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").notNull(),
  decorId: integer("decor_id").notNull(),
  pricePerSqm: numeric("price_per_sqm", { precision: 10, scale: 2 }).notNull(),
  pricePerHole: numeric("price_per_hole", { precision: 10, scale: 2 }).notNull().default("0"),
  pricePackagingPerSqm: numeric("price_packaging_per_sqm", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPriceSchema = createInsertSchema(pricesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type Price = typeof pricesTable.$inferSelect;
