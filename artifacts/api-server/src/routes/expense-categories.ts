import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, expenseCategoriesTable, expensesTable } from "@workspace/db";
import {
  CreateExpenseCategoryBody,
  UpdateExpenseCategoryParams,
  UpdateExpenseCategoryBody,
  DeleteExpenseCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/expense-categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(expenseCategoriesTable)
    .orderBy(asc(expenseCategoriesTable.name));
  res.json(rows);
});

router.post("/expense-categories", async (req, res): Promise<void> => {
  const parsed = CreateExpenseCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const name = parsed.data.name.trim();
  if (!name) {
    res.status(400).json({ error: "Name cannot be empty" });
    return;
  }
  // Precheck is a UX optimization — the case-insensitive unique index on
  // `lower(name)` is the source of truth and protects us from races.
  const existing = await db
    .select({ id: expenseCategoriesTable.id })
    .from(expenseCategoriesTable)
    .where(sql`lower(${expenseCategoriesTable.name}) = lower(${name})`);
  if (existing.length > 0) {
    res.status(409).json({ error: "A category with this name already exists" });
    return;
  }
  let row;
  try {
    [row] = await db
      .insert(expenseCategoriesTable)
      .values({ name, color: parsed.data.color ?? null })
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "A category with this name already exists" });
      return;
    }
    throw err;
  }
  res.status(201).json(row);
});

router.patch("/expense-categories/:id", async (req, res): Promise<void> => {
  const params = UpdateExpenseCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateExpenseCategoryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const patch: { name?: string; color?: string | null } = {};
  if (body.data.name !== undefined) {
    const trimmed = body.data.name.trim();
    if (!trimmed) {
      res.status(400).json({ error: "Name cannot be empty" });
      return;
    }
    const dupes = await db
      .select({ id: expenseCategoriesTable.id })
      .from(expenseCategoriesTable)
      .where(sql`lower(${expenseCategoriesTable.name}) = lower(${trimmed})`);
    if (dupes.some((d) => d.id !== params.data.id)) {
      res.status(409).json({ error: "Another category with this name already exists" });
      return;
    }
    patch.name = trimmed;
  }
  if (body.data.color !== undefined) {
    patch.color = body.data.color;
  }
  let row;
  try {
    [row] = await db
      .update(expenseCategoriesTable)
      .set(patch)
      .where(eq(expenseCategoriesTable.id, params.data.id))
      .returning();
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Another category with this name already exists" });
      return;
    }
    throw err;
  }
  if (!row) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(row);
});

router.delete("/expense-categories/:id", async (req, res): Promise<void> => {
  const params = DeleteExpenseCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Check for referencing expenses up front so we can return a friendly 409
  // instead of letting the FK throw a generic 500.
  const inUse = await db
    .select({ id: expensesTable.id })
    .from(expensesTable)
    .where(eq(expensesTable.categoryId, params.data.id))
    .limit(1);
  if (inUse.length > 0) {
    res.status(409).json({
      error: "Category is in use — delete or reassign its expenses first",
    });
    return;
  }
  let row;
  try {
    [row] = await db
      .delete(expenseCategoriesTable)
      .where(eq(expenseCategoriesTable.id, params.data.id))
      .returning();
  } catch (err) {
    // Race window — an expense was inserted after our precheck. Surface 409.
    if (isFkViolation(err)) {
      res.status(409).json({
        error: "Category is in use — delete or reassign its expenses first",
      });
      return;
    }
    throw err;
  }
  if (!row) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.sendStatus(204);
});

// pg error codes — mapped to friendly HTTP responses above.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
function isFkViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23503";
}

export default router;
