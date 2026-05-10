import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Case-insensitive uniqueness on `name` is enforced via a functional unique
// index on `lower(name)` — see migrations / route-level handling.
export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // Optional accent color (Tailwind hue name or hex) used for the
  // per-category total cards on the Expenses page.
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  nameUniqueCi: uniqueIndex("expense_categories_name_unique_ci").on(sql`lower(${t.name})`),
}));

export const insertExpenseCategorySchema = createInsertSchema(expenseCategoriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;
