import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, loaTable } from "@workspace/db";
import {
  CreateLoaBody,
  GetLoaParams,
  UpdateLoaParams,
  UpdateLoaBody,
  DeleteLoaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/loa", async (_req, res): Promise<void> => {
  const entries = await db.select().from(loaTable).orderBy(desc(loaTable.createdAt));
  res.json(entries);
});

router.post("/loa", async (req, res): Promise<void> => {
  const parsed = CreateLoaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [loa] = await db.insert(loaTable).values(parsed.data).returning();
  res.status(201).json(loa);
});

router.get("/loa/:id", async (req, res): Promise<void> => {
  const params = GetLoaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [loa] = await db.select().from(loaTable).where(eq(loaTable.id, params.data.id));
  if (!loa) {
    res.status(404).json({ error: "LOA not found" });
    return;
  }
  res.json(loa);
});

router.patch("/loa/:id", async (req, res): Promise<void> => {
  const params = UpdateLoaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateLoaBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [loa] = await db
    .update(loaTable)
    .set(body.data)
    .where(eq(loaTable.id, params.data.id))
    .returning();
  if (!loa) {
    res.status(404).json({ error: "LOA not found" });
    return;
  }
  res.json(loa);
});

router.delete("/loa/:id", async (req, res): Promise<void> => {
  const params = DeleteLoaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [loa] = await db
    .delete(loaTable)
    .where(eq(loaTable.id, params.data.id))
    .returning();
  if (!loa) {
    res.status(404).json({ error: "LOA not found" });
    return;
  }
  res.sendStatus(204);
});

// PDF generation endpoint
router.get("/loa/:id/pdf", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [loa] = await db.select().from(loaTable).where(eq(loaTable.id, id));
  if (!loa) {
    res.status(404).json({ error: "LOA not found" });
    return;
  }

  // A4: 595.28 x 841.89 points
  const doc = new PDFDocument({ size: "A4", margin: 60, info: { Title: "Letter of Appointment" } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="LOA-${loa.candidateName?.replace(/\s+/g, "-") ?? id}.pdf"`
  );
  doc.pipe(res);

  const PAGE_W = 595.28 - 120; // usable width (margin 60 each side)
  const LEFT = 60;

  // ─── Title ───────────────────────────────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("LETTER OF APPOINTMENT", { align: "center" })
    .moveDown(1.5);

  // ─── Helper functions ─────────────────────────────────────────────────────
  const sectionHeader = (num: string, title: string) => {
    doc.font("Helvetica-Bold").fontSize(11).text(`${num}. ${title}`).moveDown(0.4);
  };

  const field = (label: string, value: string | null | undefined) => {
    const val = value?.trim() || "";
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${label}: `, { continued: true })
      .font("Helvetica")
      .text(val || "________________________");
  };

  const lineGap = () => doc.moveDown(0.3);

  // ─── Section 1: Employer ─────────────────────────────────────────────────
  sectionHeader("1", "Details of Employer;");
  field("Name", loa.companyName); lineGap();
  field("Address", loa.companyAddress); lineGap();
  field("Contact Details / Email address", loa.companyEmail); lineGap();
  field("Country of origin", loa.companyCountry); lineGap();
  field("Registration Number/ID Card", loa.companyRegistrationNumber);
  doc.moveDown(1);

  // ─── Section 2: Employee ─────────────────────────────────────────────────
  sectionHeader("2", "Details of Employee;");
  field("Name", loa.candidateName); lineGap();
  field("Permanent Address", loa.candidateAddress); lineGap();
  field("Nationality", loa.candidateNationality); lineGap();
  field("Date of Birth", loa.candidateDateOfBirth); lineGap();
  field("Passport Number", loa.candidatePassportNumber); lineGap();
  field("Emergency Contact Details (name and contact number)", loa.candidateEmergencyContact);
  doc.moveDown(1);

  // ─── Section 3: Employment ───────────────────────────────────────────────
  sectionHeader("3", "Details of Employment;");
  field("Job Title / Occupation", loa.jobTitle); lineGap();
  field("Work Type", loa.workType); lineGap();
  field("Basic Salary (USD)", loa.basicSalary); lineGap();
  field("Date of Salary payment", loa.salaryPaymentDate); lineGap();
  field("Work site", loa.workSite); lineGap();
  field("Date of Commence", loa.dateOfCommence || "Date of Arrival"); lineGap();
  field("Job Description", loa.jobDescription || "Job Description will be given the time of signing the contract"); lineGap();
  field("Working Hours", loa.workingHours || "09:00 to 17:00 Saturday to Sunday"); lineGap();
  field("Work Status (Permanent / Contract)", loa.workStatus || "Contract based"); lineGap();
  field("Contract Duration (if Contracted employee)", loa.contractDuration || "Contract will be for 2 years, Probation period is 3 months");
  doc.moveDown(1);

  // ─── Signatory ────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(11).text("Details of Signatory;").moveDown(0.4);
  field("Name", loa.signatoryName); lineGap();
  field("Designation", loa.signatoryDesignation);
  doc.moveDown(1.5);

  doc.font("Helvetica-Bold").fontSize(10).text("Signature:", { continued: true })
    .font("Helvetica").text("  ______________________________");
  doc.moveDown(0.5);
  field("Date", loa.signatureDate);

  doc.end();
});

export default router;
