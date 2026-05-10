import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, loaOptionsTable, LOA_OPTION_CATEGORIES } from "@workspace/db";
import {
  ListLoaOptionsQueryParams,
  CreateLoaOptionBody,
  DeleteLoaOptionParams,
  UpdateLoaOptionParams,
  UpdateLoaOptionBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/loa-options", async (req, res): Promise<void> => {
  const parsed = ListLoaOptionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category } = parsed.data;
  const rows = await db
    .select()
    .from(loaOptionsTable)
    .where(category ? eq(loaOptionsTable.category, category) : undefined)
    .orderBy(asc(loaOptionsTable.category), asc(loaOptionsTable.value));
  res.json(rows);
});

router.post("/loa-options", async (req, res): Promise<void> => {
  const parsed = CreateLoaOptionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const value = parsed.data.value.trim();
  if (!value) {
    res.status(400).json({ error: "Value cannot be empty" });
    return;
  }
  if (!(LOA_OPTION_CATEGORIES as readonly string[]).includes(parsed.data.category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }

  // Check for existing duplicate (case-insensitive) within the same category.
  // Note: there is also a DB-level unique index on (category, lower(value))
  // — the catch below converts a race-condition unique violation into 409.
  const existing = await db
    .select()
    .from(loaOptionsTable)
    .where(
      and(
        eq(loaOptionsTable.category, parsed.data.category),
        sql`lower(${loaOptionsTable.value}) = lower(${value})`
      )
    );
  if (existing.length > 0) {
    res.status(409).json({ error: "Option already exists in this category" });
    return;
  }

  try {
    const [row] = await db
      .insert(loaOptionsTable)
      .values({ category: parsed.data.category, value })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    // Postgres unique-violation code → translate to 409 instead of 500
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "Option already exists in this category" });
      return;
    }
    req.log.error({ err }, "Failed to create LOA option");
    res.status(500).json({ error: "Failed to create option" });
  }
});

router.patch("/loa-options/:id", async (req, res): Promise<void> => {
  const params = UpdateLoaOptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateLoaOptionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const value = body.data.value.trim();
  if (!value) {
    res.status(400).json({ error: "Value cannot be empty" });
    return;
  }

  const [current] = await db
    .select()
    .from(loaOptionsTable)
    .where(eq(loaOptionsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Option not found" });
    return;
  }

  // Check for duplicates within the same category, excluding this row
  const dup = await db
    .select()
    .from(loaOptionsTable)
    .where(
      and(
        eq(loaOptionsTable.category, current.category),
        sql`lower(${loaOptionsTable.value}) = lower(${value})`,
        sql`${loaOptionsTable.id} <> ${params.data.id}`
      )
    );
  if (dup.length > 0) {
    res.status(409).json({ error: "Another option with this value already exists" });
    return;
  }

  try {
    const [row] = await db
      .update(loaOptionsTable)
      .set({ value })
      .where(eq(loaOptionsTable.id, params.data.id))
      .returning();
    res.json(row);
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "Another option with this value already exists" });
      return;
    }
    req.log.error({ err }, "Failed to update LOA option");
    res.status(500).json({ error: "Failed to update option" });
  }
});

router.delete("/loa-options/:id", async (req, res): Promise<void> => {
  const params = DeleteLoaOptionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(loaOptionsTable)
    .where(eq(loaOptionsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Option not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
