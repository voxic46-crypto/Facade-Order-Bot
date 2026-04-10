import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  rowNumber: integer("row_number").notNull(),
  height: numeric("height", { precision: 8, scale: 1 }).notNull(),
  width: numeric("width", { precision: 8, scale: 1 }).notNull(),
  quantity: integer("quantity").notNull(),
  holes: integer("holes").notNull().default(0),
  area: numeric("area", { precision: 10, scale: 4 }).notNull(),
  facadesCost: numeric("facades_cost", { precision: 10, scale: 2 }).notNull(),
  holesCost: numeric("holes_cost", { precision: 10, scale: 2 }).notNull(),
  packagingCost: numeric("packaging_cost", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
