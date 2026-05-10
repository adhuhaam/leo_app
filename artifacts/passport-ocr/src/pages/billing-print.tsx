import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetBillingDocument,
  useListCompanies,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";

function formatMVR(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "MVR 0.00";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "MVR 0.00";
  return `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BillingPrintPage() {
  const [, params] = useRoute("/billing/:id/print");
  const id = params?.id ? Number(params.id) : 0;
  const { data: doc, isLoading } = useGetBillingDocument(id);
  const { data: companies = [] } = useListCompanies({ withBranding: true });
  const company = companies.find((c) => c.id === doc?.companyId);

  // Inject a print-only stylesheet so the toolbar disappears and the page
  // renders edge-to-edge when printing or saving as PDF.
  useEffect(() => {
    const css = `
      @page { size: A4; margin: 14mm; }
      @media print {
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-shell { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: none !important; }
        .print-page { box-shadow: none !important; border: none !important; padding: 0 !important; }
      }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (isLoading || !doc) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isInvoice = doc.kind === "invoice";
  const subtotal = doc.items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const gstRate = Number(doc.gstRate || 0);
  const taxable = doc.gstInclusive ? subtotal / (1 + gstRate / 100) : subtotal;
  const gstAmount = doc.gstInclusive ? subtotal - taxable : (subtotal * gstRate) / 100;
  const grand = doc.gstInclusive ? subtotal : subtotal + gstAmount;
  const itemsTotal = doc.items.reduce((s, it) => s + Number(it.qty || 0), 0);

  return (
    <div className="bg-muted/30 min-h-screen py-6">
      {/* Toolbar — hidden on print */}
      <div className="no-print max-w-3xl mx-auto px-4 mb-4 flex items-center justify-between">
        <Link href="/billing">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Button size="sm" className="gap-2" onClick={() => window.print()} data-testid="button-print">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* The printable document — A4-ish proportions */}
      <div className="print-shell max-w-3xl mx-auto bg-white text-slate-900 shadow-lg rounded-md overflow-hidden">
        <div className="print-page p-10 text-[12px] leading-relaxed">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-300">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight uppercase">
                {isInvoice ? "TAX INVOICE" : "QUOTE"}
              </h1>
              <p className="text-[13px] text-slate-700 mt-1">
                {isInvoice ? "Invoice" : "Quote"}#{" "}
                <span className="font-semibold">{doc.number}</span>
              </p>
              {isInvoice && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Balance Due
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{formatMVR(grand)}</p>
                </div>
              )}
            </div>
            <div className="text-right text-[11px] text-slate-700 max-w-[260px]">
              {company?.letterheadImage ? (
                <img
                  src={company.letterheadImage}
                  alt={company.name}
                  className="ml-auto max-h-20 object-contain mb-2"
                />
              ) : null}
              <p className="font-bold text-[13px] text-slate-900 uppercase">
                {doc.companyName}
              </p>
              {company?.registrationNumber && (
                <p className="font-mono">{company.registrationNumber}</p>
              )}
              {company?.phone && <p>{company.phone}</p>}
              {company?.address && (
                <p className="whitespace-pre-line">{company.address}</p>
              )}
              {company?.email && <p>{company.email}</p>}
            </div>
          </div>

          {/* Dates + bill to */}
          <div className="grid grid-cols-2 gap-6 py-5 border-b border-slate-200">
            <div className="space-y-1.5">
              <DateRow
                label={isInvoice ? "Invoice Date" : "Quote Date"}
                value={formatDate(doc.issueDate)}
              />
              {isInvoice && doc.terms && <DateRow label="Terms" value={doc.terms} />}
              {isInvoice && doc.dueDate && (
                <DateRow label="Due Date" value={formatDate(doc.dueDate)} />
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Bill To
              </p>
              <p className="font-bold text-slate-900">{doc.customerName}</p>
              {doc.customerAddress && (
                <p className="whitespace-pre-line text-slate-700 mt-0.5">
                  {doc.customerAddress}
                </p>
              )}
              {doc.customerTin && (
                <p className="text-slate-700 mt-0.5">TIN: {doc.customerTin}</p>
              )}
            </div>
          </div>

          {/* Items table */}
          <table className="w-full mt-6 text-[11.5px]">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left py-2 px-3 font-semibold w-8">#</th>
                <th className="text-left py-2 px-3 font-semibold">Item &amp; Description</th>
                <th className="text-right py-2 px-3 font-semibold w-20">Qty</th>
                <th className="text-right py-2 px-3 font-semibold w-24">Rate</th>
                <th className="text-right py-2 px-3 font-semibold w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((it, i) => (
                <tr key={it.id} className="border-b border-slate-200 align-top">
                  <td className="py-3 px-3 text-slate-700">{i + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{it.description}</p>
                    {it.detail && (
                      <p className="text-slate-600 mt-1 whitespace-pre-line">{it.detail}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmt(Number(it.qty))}</td>
                  <td className="py-3 px-3 text-right tabular-nums">{fmt(Number(it.rate))}</td>
                  <td className="py-3 px-3 text-right tabular-nums font-medium">
                    {fmt(Number(it.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-6 mt-2">
            <div className="text-[11px] text-slate-700 self-start pt-3">
              {isInvoice && (
                <p>
                  Items in Total{" "}
                  <span className="font-semibold tabular-nums">{fmt(itemsTotal)}</span>
                </p>
              )}
            </div>
            <div className="space-y-1.5 text-[12px]">
              <TotalRow
                label={doc.gstInclusive ? "Sub Total" : "Sub Total"}
                value={subtotal}
                hint={doc.gstInclusive ? "(Tax Inclusive)" : undefined}
              />
              {gstRate > 0 && (
                <>
                  <TotalRow label="Total Taxable Amount" value={taxable} />
                  <TotalRow label={`GST (${gstRate}%)`} value={gstAmount} />
                </>
              )}
              <TotalRow label="Total" value={grand} bold strong />
              {isInvoice && <TotalRow label="Balance Due" value={grand} bold />}
            </div>
          </div>

          {/* Notes */}
          {doc.notes && (
            <div className="mt-10 pt-4 border-t border-slate-200">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                Notes
              </p>
              <p className="whitespace-pre-line text-slate-700 text-[11.5px]">{doc.notes}</p>
            </div>
          )}

          {/* Signatory (quotation primarily) */}
          {!isInvoice && company?.signatoryName && (
            <div className="mt-8">
              {company.signatureImage && (
                <img
                  src={company.signatureImage}
                  alt="Signature"
                  className="max-h-16 object-contain mb-1"
                />
              )}
              <p className="font-semibold text-slate-900">{company.signatoryName}</p>
              {company.signatoryDesignation && (
                <p className="text-slate-700 text-[11px]">{company.signatoryDesignation}</p>
              )}
            </div>
          )}

          {isInvoice && (
            <p className="mt-10 text-center text-[10px] text-slate-500 italic">
              This invoice is valid without a stamp or signature.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[12px]">
      <span className="text-slate-600">{label} : </span>
      <span className="font-medium text-slate-900">{value}</span>
    </p>
  );
}

function TotalRow({
  label,
  value,
  hint,
  bold,
  strong,
}: {
  label: string;
  value: number;
  hint?: string;
  bold?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 ${
        strong ? "border-t border-slate-300 pt-2 mt-1" : ""
      }`}
    >
      <span
        className={`${bold ? "font-bold text-slate-900" : "text-slate-700"} text-[11.5px]`}
      >
        {label}
        {hint && <span className="text-slate-500 text-[10px] ml-1">{hint}</span>}
      </span>
      <span
        className={`tabular-nums ${
          strong ? "text-base font-bold" : bold ? "font-semibold" : "font-medium"
        } text-slate-900`}
      >
        {bold && strong ? formatMVR(value) : fmt(value)}
      </span>
    </div>
  );
}
