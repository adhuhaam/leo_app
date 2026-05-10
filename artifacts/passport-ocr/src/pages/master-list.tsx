import { useMemo, useState } from "react";
import {
  useListPassports,
  useListLoa,
  useListCompanies,
  useDeletePassport,
  useUpdatePassport,
  getListPassportsQueryKey,
  getGetPassportStatsQueryKey,
} from "@workspace/api-client-react";
import type { Passport } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Search, Filter, MoreHorizontal, Pencil, Trash2, Loader2, Users, X } from "lucide-react";

type StatusFilter = "all" | "completed" | "processing" | "failed";
type NationalityFilter = "all" | "bangladesh" | "india";
// "" = all, "none" = candidates without any LOA
type CompanyFilter = string;

interface Row {
  passport: Passport;
  companyId: number | null;
  companyName: string | null;
  loaCount: number;
}

export default function MasterListPage() {
  const [search, setSearch] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState<NationalityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("all");

  const [editPassport, setEditPassport] = useState<Passport | null>(null);
  const [deletePassportId, setDeletePassportId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Use server-side filters for the cheap fields. Company filter is computed
  // client-side because the company link only lives on the LOA snapshot.
  const passportParams = {
    ...(search ? { search } : {}),
    ...(nationalityFilter !== "all" ? { nationality: nationalityFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  };
  const { data: passports = [], isLoading } = useListPassports(passportParams, {
    query: { queryKey: getListPassportsQueryKey(passportParams) },
  });
  const { data: loas = [] } = useListLoa();
  const { data: companies = [] } = useListCompanies();

  // Build a passport → most-recent-LOA map. LOAs are returned newest-first.
  const latestLoaByPassport = useMemo(() => {
    const m = new Map<number, { companyId: number | null; companyName: string | null; count: number }>();
    for (const loa of loas) {
      if (loa.passportId == null) continue;
      const existing = m.get(loa.passportId);
      if (existing) {
        existing.count += 1;
      } else {
        m.set(loa.passportId, {
          companyId: loa.companyId ?? null,
          companyName: loa.companyName ?? null,
          count: 1,
        });
      }
    }
    return m;
  }, [loas]);

  const rows: Row[] = useMemo(() => {
    return passports.map((p) => {
      const link = latestLoaByPassport.get(p.id);
      return {
        passport: p,
        companyId: link?.companyId ?? null,
        companyName: link?.companyName ?? null,
        loaCount: link?.count ?? 0,
      };
    });
  }, [passports, latestLoaByPassport]);

  const filteredRows = useMemo(() => {
    if (companyFilter === "all") return rows;
    if (companyFilter === "none") return rows.filter((r) => r.companyId == null);
    const id = Number(companyFilter);
    return rows.filter((r) => r.companyId === id);
  }, [rows, companyFilter]);

  const activeFilterCount =
    (search ? 1 : 0) +
    (nationalityFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (companyFilter !== "all" ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setNationalityFilter("all");
    setStatusFilter("all");
    setCompanyFilter("all");
  };

  const deleteMutation = useDeletePassport();

  const handleDelete = () => {
    if (!deletePassportId) return;
    deleteMutation.mutate(
      { id: deletePassportId },
      {
        onSuccess: () => {
          toast({ title: "Candidate deleted" });
          queryClient.invalidateQueries({ queryKey: getListPassportsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPassportStatsQueryKey() });
          setDeletePassportId(null);
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Master List
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All candidates across every company. Search, filter, edit, or remove records.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Showing <strong className="text-foreground">{filteredRows.length}</strong> of{" "}
            <strong className="text-foreground">{passports.length}</strong>
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center md:justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or passport number..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-master"
                />
              </div>
              <div className="grid grid-cols-2 md:flex gap-2">
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger className="md:w-[200px]" data-testid="select-company-filter">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="none">— No company yet —</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={nationalityFilter} onValueChange={(v) => setNationalityFilter(v as NationalityFilter)}>
                  <SelectTrigger className="md:w-[160px]" data-testid="select-nationality-filter">
                    <SelectValue placeholder="Nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Nationalities</SelectItem>
                    <SelectItem value="bangladesh">Bangladesh</SelectItem>
                    <SelectItem value="india">India</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="md:w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="md:w-auto"
                    data-testid="button-clear-filters"
                  >
                    <X className="w-4 h-4 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Passport #</TableHead>
                  <TableHead className="hidden md:table-cell">Nationality</TableHead>
                  <TableHead className="hidden lg:table-cell">DOB</TableHead>
                  <TableHead className="hidden lg:table-cell">Expiry</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">LOAs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      {passports.length === 0
                        ? "No candidates yet — upload a passport from the Process Document page."
                        : "No candidates match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(({ passport, companyName, loaCount }) => (
                    <TableRow key={passport.id} data-testid={`row-master-${passport.id}`}>
                      <TableCell className="font-medium uppercase">{passport.fullName || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{passport.passportNumber || "—"}</TableCell>
                      <TableCell className="capitalize hidden md:table-cell">{passport.nationality || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {passport.dateOfBirth || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {passport.dateOfExpiry || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {companyName ? (
                          <span className="truncate max-w-[180px] inline-block">{companyName}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-xs">— None —</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center">
                        {loaCount > 0 ? (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{loaCount}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {passport.status === "completed" && (
                          <span className="text-[10px] font-semibold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-1 rounded">
                            COMPLETED
                          </span>
                        )}
                        {passport.status === "processing" && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-1 rounded">
                            PROCESSING
                          </span>
                        )}
                        {passport.status === "failed" && (
                          <span className="text-[10px] font-semibold text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300 px-2 py-1 rounded">
                            FAILED
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              data-testid={`button-actions-master-${passport.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => setEditPassport(passport)}
                              data-testid={`menu-edit-master-${passport.id}`}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Candidate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeletePassportId(passport.id)}
                              data-testid={`menu-delete-master-${passport.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editPassport && (
        <EditCandidateDialog
          passport={editPassport}
          open={!!editPassport}
          onOpenChange={(o) => !o && setEditPassport(null)}
        />
      )}

      <AlertDialog open={!!deletePassportId} onOpenChange={(o) => !o && setDeletePassportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the candidate's passport record. Any Letters of Appointment
              already generated for them keep their snapshot of the details and are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-master"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditCandidateDialog({
  passport,
  open,
  onOpenChange,
}: {
  passport: Passport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdatePassport();

  const [form, setForm] = useState({
    fullName: passport.fullName || "",
    passportNumber: passport.passportNumber || "",
    nationality: passport.nationality || "",
    dateOfBirth: passport.dateOfBirth || "",
    dateOfIssue: passport.dateOfIssue || "",
    dateOfExpiry: passport.dateOfExpiry || "",
    address: passport.address || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      { id: passport.id, data: form },
      {
        onSuccess: () => {
          toast({ title: "Candidate updated" });
          queryClient.invalidateQueries({ queryKey: getListPassportsQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Candidate</DialogTitle>
          <DialogDescription>Update the candidate's passport details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Full Name</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="uppercase font-mono"
                data-testid="input-edit-fullname"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Passport Number</Label>
              <Input
                value={form.passportNumber}
                onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                className="uppercase font-mono"
                data-testid="input-edit-passport-number"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Select
                value={form.nationality}
                onValueChange={(v) => setForm({ ...form, nationality: v })}
              >
                <SelectTrigger data-testid="select-edit-nationality">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bangladesh">Bangladesh</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                data-testid="input-edit-dob"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Issue</Label>
              <Input
                value={form.dateOfIssue}
                onChange={(e) => setForm({ ...form, dateOfIssue: e.target.value })}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                data-testid="input-edit-issue"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Expiry</Label>
              <Input
                value={form.dateOfExpiry}
                onChange={(e) => setForm({ ...form, dateOfExpiry: e.target.value })}
                placeholder="YYYY-MM-DD or DD/MM/YYYY"
                data-testid="input-edit-expiry"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                data-testid="input-edit-address"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-candidate">
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

