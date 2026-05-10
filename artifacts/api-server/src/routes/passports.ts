import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { eq, sql, desc } from "drizzle-orm";
import { db, passportsTable } from "@workspace/db";
import {
  GetPassportParams,
  UpdatePassportParams,
  UpdatePassportBody,
  ListPassportsQueryParams,
} from "@workspace/api-zod";
import { extractPassportData } from "../lib/ocr";
import { logger } from "../lib/logger";
import { fromPath } from "pdf2pic";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import os from "os";

const router: IRouter = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and PDF files are allowed"));
    }
  },
});

async function bufferToBase64Image(
  buffer: Buffer,
  mimetype: string
): Promise<{ base64: string; mime: string }> {
  if (mimetype === "application/pdf") {
    // Convert PDF first page to image using temp file
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "passport-"));
    const tmpPdf = path.join(tmpDir, "passport.pdf");
    const tmpImg = path.join(tmpDir, "passport");

    try {
      await fs.writeFile(tmpPdf, buffer);

      const convert = fromPath(tmpPdf, {
        density: 200,
        saveFilename: "passport",
        savePath: tmpDir,
        format: "png",
        width: 1600,
        height: 1200,
      });

      const result = await convert(1);
      if (!result.path) {
        throw new Error("PDF to image conversion failed");
      }

      const imgBuffer = await fs.readFile(result.path);
      const base64 = imgBuffer.toString("base64");
      return { base64, mime: "image/png" };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  // For images, resize if too large and convert to JPEG
  const processed = await sharp(buffer)
    .resize(1600, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  return { base64: processed.toString("base64"), mime: "image/jpeg" };
}

// GET /passports — list all
router.get("/passports", async (req, res): Promise<void> => {
  const parsed = ListPassportsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, nationality, status } = parsed.data;

  let query = db.select().from(passportsTable);

  const conditions = [];
  if (nationality) {
    conditions.push(eq(passportsTable.nationality, nationality));
  }
  if (status) {
    conditions.push(eq(passportsTable.status, status));
  }

  const results = await db
    .select()
    .from(passportsTable)
    .where(conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined)
    .orderBy(desc(passportsTable.createdAt));

  // Apply search filter in memory (name and passport number)
  const filtered = search
    ? results.filter(
        (p) =>
          p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          p.passportNumber?.toLowerCase().includes(search.toLowerCase())
      )
    : results;

  res.json(filtered);
});

// POST /passports/upload — upload and extract
router.post("/passports/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  // Create a pending passport record
  const [passport] = await db
    .insert(passportsTable)
    .values({
      status: "processing",
      originalFilename: req.file.originalname,
    })
    .returning();

  req.log.info({ passportId: passport.id }, "Passport record created, starting OCR");

  // Process asynchronously and update record
  (async () => {
    try {
      const { base64, mime } = await bufferToBase64Image(req.file!.buffer, req.file!.mimetype);
      const extracted = await extractPassportData(base64, mime);

      await db
        .update(passportsTable)
        .set({
          ...extracted,
          status: "completed",
        })
        .where(eq(passportsTable.id, passport.id));

      logger.info({ passportId: passport.id }, "OCR extraction completed");
    } catch (err) {
      logger.error({ err, passportId: passport.id }, "OCR extraction failed");
      await db
        .update(passportsTable)
        .set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(passportsTable.id, passport.id));
    }
  })();

  res.status(201).json(passport);
});

// GET /passports/stats — dashboard stats
router.get("/passports/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(passportsTable).orderBy(desc(passportsTable.createdAt));

  const stats = {
    total: all.length,
    completed: all.filter((p) => p.status === "completed").length,
    processing: all.filter((p) => p.status === "processing").length,
    failed: all.filter((p) => p.status === "failed").length,
    bangladeshi: all.filter((p) => p.nationality === "bangladesh").length,
    indian: all.filter((p) => p.nationality === "india").length,
    recentUploads: all.slice(0, 5),
  };

  res.json(stats);
});

// GET /passports/:id — get single
router.get("/passports/:id", async (req, res): Promise<void> => {
  const params = GetPassportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [passport] = await db
    .select()
    .from(passportsTable)
    .where(eq(passportsTable.id, params.data.id));

  if (!passport) {
    res.status(404).json({ error: "Passport not found" });
    return;
  }

  res.json(passport);
});

// PATCH /passports/:id — update
router.patch("/passports/:id", async (req, res): Promise<void> => {
  const params = UpdatePassportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdatePassportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [passport] = await db
    .update(passportsTable)
    .set({ ...body.data })
    .where(eq(passportsTable.id, params.data.id))
    .returning();

  if (!passport) {
    res.status(404).json({ error: "Passport not found" });
    return;
  }

  res.json(passport);
});

// DELETE /passports/:id — delete
router.delete("/passports/:id", async (req, res): Promise<void> => {
  const params = GetPassportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [passport] = await db
    .delete(passportsTable)
    .where(eq(passportsTable.id, params.data.id))
    .returning();

  if (!passport) {
    res.status(404).json({ error: "Passport not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
