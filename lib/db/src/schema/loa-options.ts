import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const LOA_OPTION_CATEGORIES = ["work_type", "work_site", "job_title"] as const;
export type LoaOptionCategory = (typeof LOA_OPTION_CATEGORIES)[number];

export const loaOptionsTable = pgTable(
  "loa_options",
  {
    id: serial("id").primaryKey(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Case-insensitive uniqueness so "Manager" and "manager" can't both exist in the same category.
    uniqueCategoryValue: uniqueIndex("loa_options_category_value_idx").on(t.category, sql`lower(${t.value})`),
  })
);

export const insertLoaOptionSchema = createInsertSchema(loaOptionsTable).omit({ id: true, createdAt: true });
export type InsertLoaOption = z.infer<typeof insertLoaOptionSchema>;
export type LoaOption = typeof loaOptionsTable.$inferSelect;
