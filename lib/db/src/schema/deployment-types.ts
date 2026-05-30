import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deploymentTypesTable = pgTable("deployment_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeploymentTypeSchema = createInsertSchema(deploymentTypesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDeploymentType = z.infer<typeof insertDeploymentTypeSchema>;
export type DeploymentType = typeof deploymentTypesTable.$inferSelect;
