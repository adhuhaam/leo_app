import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deploymentTypesTable } from "@workspace/db";
import { requirePermission } from "../lib/rbac";

const router: IRouter = Router();

router.get("/deployment-types", requirePermission("passports.read"), async (_req, res) => {
  const types = await db.select().from(deploymentTypesTable).orderBy(deploymentTypesTable.name);
  res.json(types);
});

export default router;
