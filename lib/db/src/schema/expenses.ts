import { pgTable, text, serial, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { expenseCategoriesTable } from "./expense-categories";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  // Restrict on delete — we never want to silently lose expense rows when a
  // category is removed. The category routes refuse delete if any expense
  // still references it and surface a clear error to the UI.
  categoryId: integer("category_id")
    .notNull()
    .references((): AnyPgColumn => expenseCategoriesTable.id, { onDelete: "restrict" }),
  // numeric(14,2) — pg returns this as a string, which is what we want so we
  // never lose precision through JS floats.
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  // Optional expense date (legacy app allowed blank dates).
  expenseDate: date("expense_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
