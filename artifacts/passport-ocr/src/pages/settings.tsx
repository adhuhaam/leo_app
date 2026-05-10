import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLoaOptions,
  useCreateLoaOption,
  useDeleteLoaOption,
  useListCompanies,
  useUpdateCompany,
  getListLoaOptionsQueryKey,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import type { LoaOption, Company } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Briefcase, MapPin, Hammer, Settings as SettingsIcon, Building2, Image as ImageIcon, Upload, X } from "lucide-react";

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

      <div className="grid gap-6 lg:grid-cols-3">
        {LISTS.map((cfg) => (
          <OptionList key={cfg.category} cfg={cfg} />
        ))}
      </div>

      <CompaniesBrandingSection />
    </div>
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
