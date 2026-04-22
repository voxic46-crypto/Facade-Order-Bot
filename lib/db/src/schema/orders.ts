import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").notNull(),
  decorId: integer("decor_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull(),
  customerEmail: text("customer_email"),
  totalArea: numeric("total_area", { precision: 10, scale: 4 }).notNull(),
  totalFacadesCost: numeric("total_facades_cost", { precision: 10, scale: 2 }).notNull(),
  totalHolesCost: numeric("total_holes_cost", { precision: 10, scale: 2 }).notNull(),
  totalPackagingCost: numeric("total_packaging_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  attachedFileUrl: text("attached_file_url"),
  invoiceNumber: text("invoice_number"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
