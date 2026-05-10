import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

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
  // Operational fields — where the candidate ends up after onboarding.
  // FK to clients.id, set to NULL when the client is deleted (matches the DB
  // constraint added in the same migration as these columns).
  clientId: integer("client_id").references((): import("drizzle-orm/pg-core").AnyPgColumn => clientsTable.id, { onDelete: "set null" }),
  workPermitNumber: text("work_permit_number"),
  agent: text("agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPassportSchema = createInsertSchema(passportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPassport = z.infer<typeof insertPassportSchema>;
export type Passport = typeof passportsTable.$inferSelect;
