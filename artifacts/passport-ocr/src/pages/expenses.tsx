import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListExpenses,
  useListExpenseCategories,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  getListExpensesQueryKey,
} from "@workspace/api-client-react";
import type { Expense, ExpenseCategory } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wallet, Loader2, Search } from "lucide-react";
import { Link } from "wouter";

// Mirror of the palette in settings.tsx — kept in sync by name. Each card uses
// a soft gradient + a vivid accent stripe so a row of categories reads as a
// compact dashboard rather than a wall of solid blocks.
const COLOR_STYLES: Record<
  string,
  { card: string; stripe: string; label: string; amount: string; dot: string }
> = {
  slate:   { card: "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-900/60",   stripe: "bg-slate-300",   label: "text-slate-300",    amount: "text-white",        dot: "bg-slate-400" },
  sky:     { card: "bg-gradient-to-br from-sky-500 to-sky-600 border-sky-600/60",         stripe: "bg-sky-200",     label: "text-sky-50/90",    amount: "text-white",        dot: "bg-sky-300" },
  amber:   { card: "bg-gradient-to-br from-amber-300 to-amber-400 border-amber-500/60",   stripe: "bg-amber-700",   label: "text-amber-900/80", amount: "text-amber-950",    dot: "bg-amber-700" },
  emerald: { card: "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600/60", stripe: "bg-emerald-200", label: "text-emerald-50/90", amount: "text-white",     dot: "bg-emerald-200" },
  rose:    { card: "bg-gradient-to-br from-rose-500 to-rose-600 border-rose-600/60",       stripe: "bg-rose-200",    label: "text-rose-50/90",   amount: "text-white",        dot: "bg-rose-200" },
  violet:  { card: "bg-gradient-to-br from-violet-500 to-violet-600 border-violet-600/60", stripe: "bg-violet-200",  label: "text-violet-50/90", amount: "text-white",        dot: "bg-violet-200" },
  indigo:  { card: "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-600/60", stripe: "bg-indigo-200",  label: "text-indigo-50/90", amount: "text-white",        dot: "bg-indigo-200" },
  teal:    { card: "bg-gradient-to-br from-teal-500 to-teal-600 border-teal-600/60",       stripe: "bg-teal-200",    label: "text-teal-50/90",   amount: "text-white",        dot: "bg-teal-200" },
};
const DEFAULT_STYLE = {
  card: "bg-card border-border",
  stripe: "bg-muted-foreground/40",
  label: "text-muted-foreground",
  amount: "text-foreground",
  dot: "bg-muted-foreground/50",
};

function styleFor(color: string | null | undefined) {
  if (!color) return DEFAULT_STYLE;
  return COLOR_STYLES[color] ?? DEFAULT_STYLE;
}

function formatMVR(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "MVR 0.00";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "MVR 0.00";
  return `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string | null | undefined): string {
  if (!d || d === "0000-00-00") return "—";
  return d;
}

interface ExpenseFormState {
  categoryId: string; // string in form, parsed to int on submit
  amount: string;
  expenseDate: string;
  remarks: string;
}

const EMPTY_FORM: ExpenseFormState = {
  categoryId: "",
  amount: "",
  expenseDate: "",
  remarks: "",
};

export default function ExpensesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);

  const {
    data: categories = [],
    isLoading: catsLoading,
    error: catsError,
  } = useListExpenseCategories();
  const {
    data: expenses = [],
    isLoading: expensesLoading,
    error: expensesError,
  } = useListExpenses(filterCategory === "all" ? undefined : { categoryId: Number(filterCategory) });
  const deleteMutation = useDeleteExpense();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });

  // Total + per-category totals are computed from the unfiltered category list
  // so the cards stay stable as the user filters/searches the table.
  const { data: allExpenses = [], error: allExpensesError } = useListExpenses();
  const loadError = catsError ?? expensesError ?? allExpensesError;
  const grandTotal = useMemo(
    () => allExpenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [allExpenses],
  );
  const totalsByCategory = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of allExpenses) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + Number(e.amount || 0));
    }
    return map;
  }, [allExpenses]);

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(
      (e) =>
        e.categoryName.toLowerCase().includes(q) ||
        (e.remarks?.toLowerCase().includes(q) ?? false) ||
        (e.expenseDate?.includes(q) ?? false),
    );
  }, [expenses, search]);

  const handleDelete = (e: Expense) => {
    deleteMutation.mutate(
      { id: e.id },
      {
        onSuccess: () => {
          invalidate();
          setConfirmDelete(null);
          toast({ title: "Expense deleted" });
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      },
    );
  };

  const noCategoriesYet = !catsLoading && categories.length === 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Cash Flow
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Expense Manager</h1>
          <p className="text-muted-foreground mt-2">
            Track expenses by category. Totals update as you add, edit, or remove entries.
          </p>
        </div>
        <Button
          onClick={() => setAddOpen(true)}
          disabled={noCategoriesYet}
          data-testid="button-add-expense"
        >
          <Plus className="h-4 w-4 mr-1" /> Add expense
        </Button>
      </div>

      {loadError && (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          data-testid="banner-expenses-error"
        >
          Couldn't load expenses. Check your connection and refresh the page.
        </div>
      )}

      {noCategoriesYet && (
        <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
          You don't have any expense categories yet.{" "}
          <Link href="/settings" className="font-medium underline underline-offset-2">
            Add categories in Settings
          </Link>{" "}
          to start logging expenses.
        </div>
      )}

      {/* Total + per-category cards — pill-sized buttons */}
      <div className="flex flex-wrap gap-2">
        <TotalCard
          label="Total"
          amount={grandTotal}
          accent={{
            card: "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-900/60",
            stripe: "bg-amber-300",
            label: "text-slate-300",
            amount: "text-white",
            dot: "bg-amber-300",
          }}
          count={allExpenses.length}
          testId="total"
        />
        {catsLoading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-32 rounded-full" />)
          : categories.map((c) => (
              <TotalCard
                key={c.id}
                label={c.name}
                amount={totalsByCategory.get(c.id) ?? 0}
                accent={styleFor(c.color)}
                count={allExpenses.filter((e) => e.categoryId === c.id).length}
                testId={`category-${c.id}`}
              />
            ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search remarks, category, date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            data-testid="input-search-expenses"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-100">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Type</th>
                  <th className="text-left font-semibold px-4 py-3">Amount</th>
                  <th className="text-left font-semibold px-4 py-3">Date</th>
                  <th className="text-left font-semibold px-4 py-3">Remarks</th>
                  <th className="text-right font-semibold px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {expensesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t border-border/60">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No expenses to show.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => {
                    const cat = categories.find((c) => c.id === e.categoryId);
                    return (
                      <tr
                        key={e.id}
                        className="border-t border-border/60 hover:bg-muted/40"
                        data-testid={`row-expense-${e.id}`}
                      >
                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex items-center gap-2 font-medium">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                              cat ? styleFor(cat.color).card.split(" ")[0] : "bg-muted"
                            }`} />
                            {e.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top tabular-nums">{formatMVR(e.amount)}</td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">{formatDate(e.expenseDate)}</td>
                        <td className="px-4 py-3 align-top max-w-md whitespace-pre-wrap break-words">
                          {e.remarks ?? ""}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-500"
                              onClick={() => setEditing(e)}
                              data-testid={`button-edit-expense-${e.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-rose-500 border-rose-600 text-white hover:bg-rose-600"
                              onClick={() => setConfirmDelete(e)}
                              data-testid={`button-delete-expense-${e.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Del
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ExpenseFormDialog
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
      />
      <ExpenseFormDialog
        mode="edit"
        open={editing != null}
        onOpenChange={(o) => !o && setEditing(null)}
        categories={categories}
        expense={editing}
      />

      <AlertDialog
        open={confirmDelete != null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {formatMVR(confirmDelete?.amount)} entry under{" "}
              <strong>{confirmDelete?.categoryName}</strong>. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) handleDelete(confirmDelete);
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-expense"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TotalCard({
  label,
  amount,
  accent,
  count,
  testId,
}: {
  label: string;
  amount: number;
  accent: { card: string; stripe: string; label: string; amount: string; dot: string };
  count: number;
  testId: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-full border ${accent.card} shadow-sm transition-shadow hover:shadow`}
      data-testid={`card-total-${testId}`}
      title={`${label} • ${count} ${count === 1 ? "entry" : "entries"}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.stripe}`} aria-hidden />
      <span
        className={`text-[10px] font-semibold tracking-wide uppercase max-w-[90px] truncate ${accent.label}`}
      >
        {label}
      </span>
      <span className={`text-[11px] font-bold tabular-nums ${accent.amount}`}>
        {formatMVR(amount)}
      </span>
      <span
        className={`text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-black/15 ${accent.label}`}
      >
        {count}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit dialog (handles both create and update)
// ---------------------------------------------------------------------------

function ExpenseFormDialog({
  mode,
  open,
  onOpenChange,
  categories,
  expense,
}: {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ExpenseCategory[];
  expense?: Expense | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<ExpenseFormState>(EMPTY_FORM);

  // Reset the form whenever the dialog opens — for edit mode, prefill from
  // the row; for create mode, default to today.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && expense) {
      setForm({
        categoryId: String(expense.categoryId),
        amount: expense.amount ?? "",
        expenseDate: expense.expenseDate ?? "",
        remarks: expense.remarks ?? "",
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        ...EMPTY_FORM,
        categoryId: categories[0]?.id != null ? String(categories[0].id) : "",
        expenseDate: today,
      });
    }
  }, [open, mode, expense, categories]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });

  const handleSubmit = () => {
    if (!form.categoryId) {
      toast({ title: "Pick a category", variant: "destructive" });
      return;
    }
    const amt = form.amount.replace(/,/g, "").trim();
    if (!amt || !/^\d+(\.\d{1,2})?$/.test(amt) || Number(amt) < 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (mode === "create") {
      createMutation.mutate(
        {
          data: {
            categoryId: Number(form.categoryId),
            amount: amt,
            expenseDate: form.expenseDate || undefined,
            remarks: form.remarks.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Expense added" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to add expense", variant: "destructive" }),
        },
      );
    } else if (expense) {
      // Build a partial patch so we don't send fields the user didn't change.
      const patch: {
        categoryId?: number;
        amount?: string;
        expenseDate?: string | null;
        remarks?: string | null;
      } = {};
      if (Number(form.categoryId) !== expense.categoryId) patch.categoryId = Number(form.categoryId);
      if (amt !== expense.amount) patch.amount = amt;
      const newDate = form.expenseDate.trim();
      const oldDate = expense.expenseDate ?? "";
      if (newDate !== oldDate) patch.expenseDate = newDate || null;
      const newRemarks = form.remarks.trim();
      const oldRemarks = expense.remarks ?? "";
      if (newRemarks !== oldRemarks) patch.remarks = newRemarks || null;

      if (Object.keys(patch).length === 0) {
        onOpenChange(false);
        return;
      }
      updateMutation.mutate(
        {
          id: expense.id,
          data: patch as unknown as Parameters<typeof updateMutation.mutate>[0]["data"],
        },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Expense updated" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to update expense", variant: "destructive" }),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add expense" : "Edit expense"}</DialogTitle>
          <DialogDescription>
            All amounts are recorded in MVR. Leave the date blank if it isn't known yet.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => setForm((s) => ({ ...s, categoryId: v }))}
            >
              <SelectTrigger data-testid="select-expense-category">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Amount (MVR) <span className="text-destructive">*</span>
              </Label>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                data-testid="input-expense-amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Date</Label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm((s) => ({ ...s, expenseDate: e.target.value }))}
                data-testid="input-expense-date"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              rows={3}
              placeholder="Optional notes (e.g. permit number, recipient)…"
              value={form.remarks}
              onChange={(e) => setForm((s) => ({ ...s, remarks: e.target.value }))}
              data-testid="input-expense-remarks"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-expense">
            {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {mode === "create" ? "Add expense" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
