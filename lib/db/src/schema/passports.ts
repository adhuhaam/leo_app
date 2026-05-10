import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const passportsTable = pgTable("passports", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  passportNumber: text("passport_number"),
  dateOfBirth: text("date_of_birth"),
  dateOfIssue: text("date_of_issue"),
  dateOfExpiry: text("date_of_expiry"),
  address: text("address"),
  nationality: text("nationality"),
  status: text("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  originalFilename: text("original_filename"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPassportSchema = createInsertSchema(passportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPassport = z.infer<typeof insertPassportSchema>;
export type Passport = typeof passportsTable.$inferSelect;
