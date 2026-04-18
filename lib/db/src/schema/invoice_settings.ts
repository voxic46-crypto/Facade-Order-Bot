import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const invoiceSettingsTable = pgTable("invoice_settings", {
  id: serial("id").primaryKey(),
  supplierName: text("supplier_name").notNull().default(""),
  supplierInn: text("supplier_inn").notNull().default(""),
  supplierKpp: text("supplier_kpp").notNull().default(""),
  supplierAddress: text("supplier_address").notNull().default(""),
  supplierPhone: text("supplier_phone").notNull().default(""),
  supplierEmail: text("supplier_email").notNull().default(""),
  bankName: text("bank_name").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  bankBic: text("bank_bic").notNull().default(""),
  bankCorrespondentAccount: text("bank_correspondent_account").notNull().default(""),
  invoicePrefix: text("invoice_prefix").notNull().default("СЧ-"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettingsTable).omit({ id: true, updatedAt: true });
export type InsertInvoiceSettings = z.infer<typeof insertInvoiceSettingsSchema>;
export type InvoiceSettings = typeof invoiceSettingsTable.$inferSelect;
