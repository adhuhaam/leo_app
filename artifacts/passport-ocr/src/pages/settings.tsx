import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLoaOptions,
  useCreateLoaOption,
  useDeleteLoaOption,
  useListCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
  getListLoaOptionsQueryKey,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import type { LoaOption, Company } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Briefcase, MapPin, Hammer, Settings as SettingsIcon, Building2, Image as ImageIcon, Upload, X, Save, Loader2 } from "lucide-react";

type Category = "work_type" | "work_site" | "job_title";

interface ListConfig {
  category: Category;
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string; // tailwind gradient classes
  placeholder: string;
}

const LISTS: ListConfig[] = [
  {
    category: "job_title",
    title: "Job Titles",
    description: "Occupations / roles selectable in the LOA form.",
    icon: Briefcase,
    accent: "from-indigo-500 to-violet-500",
    placeholder: "e.g. Construction Worker",
  },
  {
    category: "work_type",
    title: "Work Types",
    description: "Type of work (manual, technical, supervisory, etc.)",
    icon: Hammer,
    accent: "from-amber-500 to-orange-500",
    placeholder: "e.g. Manual Labour",
  },
  {
    category: "work_site",
    title: "Work Sites",
    description: "Project locations or sites of employment.",
    icon: MapPin,
    accent: "from-emerald-500 to-teal-500",
    placeholder: "e.g. Guraidhoo, Maldives",
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">System Configuration</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage reusable dropdown options for the Letter of Appointment generator.
        </p>
      </div>

      <CompaniesDetailsSection />

      <div className="grid gap-6 lg:grid-cols-3">
        {LISTS.map((cfg) => (
          <OptionList key={cfg.category} cfg={cfg} />
        ))}
      </div>

      <CompaniesBrandingSection />
    </div>
  );
}

// ============================================================================
// Company Details (name, address, email, country, registration number)
// ============================================================================

function CompaniesDetailsSection() {
  // Branding blobs are heavy and not needed here — fetch metadata only.
  const { data: companies = [], isLoading } = useListCompanies();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4 border-t border-border/60 pt-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-3.5 w-3.5 text-teal-600" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Company Details</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Companies</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Edit the name, address, and other details used on every Letter of Appointment.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="button-add-company">
          <Plus className="h-4 w-4 mr-1" /> Add company
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No companies yet. Click <span className="font-medium">Add company</span> to create your first one.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => <CompanyDetailsCard key={c.id} company={c} />)}
        </div>
      )}

      <AddCompanyDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

interface CompanyFormState {
  name: string;
  address: string;
  email: string;
  phone: string;
  country: string;
  registrationNumber: string;
  signatoryName: string;
  signatoryDesignation: string;
}

function companyToForm(c: Company): CompanyFormState {
  return {
    name: c.name ?? "",
    address: c.address ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    country: c.country ?? "",
    registrationNumber: c.registrationNumber ?? "",
    signatoryName: c.signatoryName ?? "",
    signatoryDesignation: c.signatoryDesignation ?? "",
  };
}

function CompanyDetailsCard({ company }: { company: Company }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [form, setForm] = useState<CompanyFormState>(() => companyToForm(company));
  // Snapshot of the upstream values the form was last synced from. Stays put
  // when the user is editing so background refetches don't clobber typed input.
  const [baseline, setBaseline] = useState<CompanyFormState>(() => companyToForm(company));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const isDirty =
    form.name !== baseline.name ||
    form.address !== baseline.address ||
    form.email !== baseline.email ||
    form.phone !== baseline.phone ||
    form.country !== baseline.country ||
    form.registrationNumber !== baseline.registrationNumber ||
    form.signatoryName !== baseline.signatoryName ||
    form.signatoryDesignation !== baseline.signatoryDesignation;

  // Only re-sync from upstream when the user has no unsaved edits. Otherwise
  // refetches (focus, invalidations) would silently wipe what they're typing.
  useEffect(() => {
    if (isDirty) return;
    const next = companyToForm(company);
    setBaseline(next);
    setForm(next);
    // We intentionally depend on `company` only — `isDirty` is checked at run
    // time and is derived from the latest `form`/`baseline` values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      toast({ title: "Name required", description: "Company name can't be empty.", variant: "destructive" });
      return;
    }
    const trimmedEmail = form.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({ title: "Invalid email", description: "Enter a valid email address or leave it blank.", variant: "destructive" });
      return;
    }

    // Build a patch of only the fields the user actually changed so we don't
    // overwrite values another tab/user may have updated in the meantime.
    const trimmed: CompanyFormState = {
      name: trimmedName,
      address: form.address.trim(),
      email: trimmedEmail,
      phone: form.phone.trim(),
      country: form.country.trim(),
      registrationNumber: form.registrationNumber.trim(),
      signatoryName: form.signatoryName.trim(),
      signatoryDesignation: form.signatoryDesignation.trim(),
    };
    const patch: Partial<CompanyFormState> = {};
    (Object.keys(trimmed) as (keyof CompanyFormState)[]).forEach((k) => {
      if (trimmed[k] !== baseline[k]) patch[k] = trimmed[k];
    });
    if (Object.keys(patch).length === 0) {
      toast({ title: "Nothing to save" });
      return;
    }

    updateCompany.mutate(
      { id: company.id, data: patch },
      {
        onSuccess: () => {
          // Adopt the just-saved values as the new baseline so the form is no
          // longer "dirty" and future refetches can sync cleanly.
          setBaseline(trimmed);
          setForm(trimmed);
          invalidate();
          toast({ title: "Saved", description: `Updated ${trimmedName}.` });
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  };

  const handleReset = () => setForm(baseline);

  const handleDelete = () => {
    deleteCompany.mutate(
      { id: company.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Deleted", description: `Removed ${company.name}.` });
          setConfirmDeleteOpen(false);
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden" data-testid={`card-company-${company.id}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">{company.name}</h3>
            <p className="text-[10px] font-mono text-muted-foreground">ID #{company.id}</p>
          </div>

          <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Delete company"
                data-testid={`button-delete-company-${company.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the company and its branding (letterhead and signature).
                  Letters of Appointment already generated for this company keep their snapshot of the
                  details and are not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteCompany.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete();
                  }}
                  disabled={deleteCompany.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid={`button-confirm-delete-company-${company.id}`}
                >
                  {deleteCompany.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid gap-3">
          <Field
            label="Company name"
            required
            value={form.name}
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
            placeholder="LEO Employment Services"
            testId={`name-${company.id}`}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm((s) => ({ ...s, email: v }))}
              placeholder="contact@example.com"
              testId={`email-${company.id}`}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              placeholder="+960 999 0000"
              testId={`phone-${company.id}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Country"
              value={form.country}
              onChange={(v) => setForm((s) => ({ ...s, country: v }))}
              placeholder="Maldives"
              testId={`country-${company.id}`}
            />
            <Field
              label="Registration #"
              value={form.registrationNumber}
              onChange={(v) => setForm((s) => ({ ...s, registrationNumber: v }))}
              placeholder="C-20542025"
              testId={`reg-${company.id}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Address</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Street, city, postcode"
              data-testid={`input-address-${company.id}`}
            />
          </div>

          <div className="pt-2 mt-1 border-t border-border/60">
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Default Signatory
            </p>
            <p className="text-[11px] text-muted-foreground mb-2">
              Used to pre-fill the &quot;Details of Signatory&quot; block when generating an LOA for this company.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Signatory name"
                value={form.signatoryName}
                onChange={(v) => setForm((s) => ({ ...s, signatoryName: v }))}
                placeholder="Abdulla Muneeb"
                testId={`signatory-name-${company.id}`}
              />
              <Field
                label="Designation"
                value={form.signatoryDesignation}
                onChange={(v) => setForm((s) => ({ ...s, signatoryDesignation: v }))}
                placeholder="Managing Director"
                testId={`signatory-designation-${company.id}`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={updateCompany.isPending}
              data-testid={`button-reset-${company.id}`}
            >
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || updateCompany.isPending}
            data-testid={`button-save-company-${company.id}`}
          >
            {updateCompany.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  testId: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={`input-${testId}`}
      />
    </div>
  );
}

function AddCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createCompany = useCreateCompany();
  const empty: CompanyFormState = {
    name: "",
    address: "",
    email: "",
    phone: "",
    country: "",
    registrationNumber: "",
    signatoryName: "",
    signatoryDesignation: "",
  };
  const [form, setForm] = useState<CompanyFormState>(empty);

  useEffect(() => {
    if (!open) setForm(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    createCompany.mutate(
      {
        data: {
          name,
          address: form.address.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          registrationNumber: form.registrationNumber.trim(),
          signatoryName: form.signatoryName.trim(),
          signatoryDesignation: form.signatoryDesignation.trim(),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          toast({ title: "Company added", description: name });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to add company", variant: "destructive" }),
      }
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Add a company</AlertDialogTitle>
          <AlertDialogDescription>
            You can edit the rest of the details — and upload a letterhead and signature — afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          <Field
            label="Company name"
            required
            value={form.name}
            onChange={(v) => setForm((s) => ({ ...s, name: v }))}
            placeholder="LEO Employment Services"
            testId="new-name"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm((s) => ({ ...s, email: v }))}
              placeholder="contact@example.com"
              testId="new-email"
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              placeholder="+960 999 0000"
              testId="new-phone"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Country"
              value={form.country}
              onChange={(v) => setForm((s) => ({ ...s, country: v }))}
              testId="new-country"
            />
            <Field
              label="Registration #"
              value={form.registrationNumber}
              onChange={(v) => setForm((s) => ({ ...s, registrationNumber: v }))}
              testId="new-reg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Address</Label>
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
              data-testid="input-new-address"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <Field
              label="Signatory name"
              value={form.signatoryName}
              onChange={(v) => setForm((s) => ({ ...s, signatoryName: v }))}
              placeholder="Abdulla Muneeb"
              testId="new-signatory-name"
            />
            <Field
              label="Designation"
              value={form.signatoryDesignation}
              onChange={(v) => setForm((s) => ({ ...s, signatoryDesignation: v }))}
              placeholder="Managing Director"
              testId="new-signatory-designation"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={createCompany.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            disabled={createCompany.isPending || !form.name.trim()}
            data-testid="button-confirm-add-company"
          >
            {createCompany.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Add company
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CompaniesBrandingSection() {
  // Need branding blobs to render previews + Replace button — opt in to heavy fields.
  const { data: companies = [], isLoading } = useListCompanies({ withBranding: true });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Company Branding</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Letterheads &amp; e-Signatures</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a letterhead image and an e-signature for each company. They will appear on every LOA generated for that company.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No companies yet. Add one from the Letter of Appointment page.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((c) => <CompanyBrandingCard key={c.id} company={c} />)}
        </div>
      )}
    </div>
  );
}

function CompanyBrandingCard({ company }: { company: Company }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateCompany = useUpdateCompany();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });

  const handleUpload = async (kind: "letterheadImage" | "signatureImage", file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload a PNG or JPG image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "Image too large",
        description: `Maximum size is ${(MAX_IMAGE_BYTES / 1024).toFixed(0)} KB. Yours is ${(file.size / 1024).toFixed(0)} KB.`,
        variant: "destructive",
      });
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateCompany.mutate(
        { id: company.id, data: { [kind]: dataUrl } },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Saved", description: `${kind === "letterheadImage" ? "Letterhead" : "Signature"} updated for ${company.name}.` });
          },
          onError: () => toast({ title: "Failed to save image", variant: "destructive" }),
        }
      );
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
    }
  };

  const handleClear = (kind: "letterheadImage" | "signatureImage") => {
    updateCompany.mutate(
      { id: company.id, data: { [kind]: null } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Removed" });
        },
        onError: () => toast({ title: "Failed to remove image", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border/60">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{company.name}</h3>
            {company.country && <p className="text-xs text-muted-foreground truncate">{company.country}</p>}
          </div>
        </div>

        <ImageSlot
          label="Letterhead"
          hint="Header image at top of PDF (e.g. logo + address banner)"
          dataUrl={company.letterheadImage ?? null}
          onPick={(f) => handleUpload("letterheadImage", f)}
          onClear={() => handleClear("letterheadImage")}
          previewClass="h-20 bg-white"
          testId={`letterhead-${company.id}`}
          disabled={updateCompany.isPending}
        />

        <ImageSlot
          label="e-Signature"
          hint="Transparent PNG works best (will sit on the signature line)"
          dataUrl={company.signatureImage ?? null}
          onPick={(f) => handleUpload("signatureImage", f)}
          onClear={() => handleClear("signatureImage")}
          previewClass="h-16 bg-[linear-gradient(45deg,_#f3f4f6_25%,_transparent_25%),_linear-gradient(-45deg,_#f3f4f6_25%,_transparent_25%),_linear-gradient(45deg,_transparent_75%,_#f3f4f6_75%),_linear-gradient(-45deg,_transparent_75%,_#f3f4f6_75%)] bg-[length:12px_12px] bg-[position:0_0,_0_6px,_6px_-6px,_-6px_0px]"
          testId={`signature-${company.id}`}
          disabled={updateCompany.isPending}
        />
      </CardContent>
    </Card>
  );
}

function ImageSlot({
  label,
  hint,
  dataUrl,
  onPick,
  onClear,
  previewClass,
  testId,
  disabled,
}: {
  label: string;
  hint: string;
  dataUrl: string | null;
  onPick: (f: File | null) => void;
  onClear: () => void;
  previewClass: string;
  testId: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {dataUrl && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
            data-testid={`button-clear-${testId}`}
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>

      <div
        className={`relative rounded-md border border-dashed border-border overflow-hidden flex items-center justify-center ${previewClass}`}
        data-testid={`preview-${testId}`}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" /> No image
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground flex-1 truncate">{hint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          data-testid={`button-upload-${testId}`}
        >
          <Upload className="h-3 w-3 mr-1" /> {dataUrl ? "Replace" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onPick(f);
            // Reset so re-selecting the same file fires onChange
            if (inputRef.current) inputRef.current.value = "";
          }}
          data-testid={`input-file-${testId}`}
        />
      </div>
    </div>
  );
}

function OptionList({ cfg }: { cfg: ListConfig }) {
  const Icon = cfg.icon;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  const { data: options = [], isLoading } = useListLoaOptions({ category: cfg.category });
  const createMutation = useCreateLoaOption();
  const deleteMutation = useDeleteLoaOption();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListLoaOptionsQueryKey({ category: cfg.category }) });

  const handleAdd = () => {
    const v = value.trim();
    if (!v) return;
    createMutation.mutate(
      { data: { category: cfg.category, value: v } },
      {
        onSuccess: () => {
          setValue("");
          invalidate();
          toast({ title: "Added", description: `Added "${v}" to ${cfg.title}.` });
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          toast({
            title: status === 409 ? "Already exists" : "Failed to add",
            description: status === 409 ? `"${v}" is already in this list.` : "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (opt: LoaOption) => {
    deleteMutation.mutate(
      { id: opt.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Removed", description: `Removed "${opt.value}".` });
        },
        onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
      }
    );
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cfg.accent} flex items-center justify-center shadow-sm flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight">{cfg.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
          </div>
        </div>

        {/* Add input */}
        <div className="flex gap-2 mb-3">
          <Input
            placeholder={cfg.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            data-testid={`input-add-${cfg.category}`}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!value.trim() || createMutation.isPending}
            data-testid={`button-add-${cfg.category}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-[120px]">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : options.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No items yet. Add the first one above.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {options.map((opt) => (
                <li
                  key={opt.id}
                  className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm hover:border-primary/40 transition-colors"
                  data-testid={`row-option-${cfg.category}-${opt.id}`}
                >
                  <span className="truncate">{opt.value}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(opt)}
                    disabled={deleteMutation.isPending}
                    title="Remove"
                    data-testid={`button-delete-option-${opt.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/60">
          {options.length} {options.length === 1 ? "item" : "items"}
        </p>
      </CardContent>
    </Card>
  );
}
