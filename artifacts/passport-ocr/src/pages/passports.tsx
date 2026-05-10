import React, { useState } from "react";
import { 
  useListPassports, 
  useDeletePassport, 
  useUpdatePassport,
  getListPassportsQueryKey,
  getGetPassportStatsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Filter, 
  Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
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
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Passport } from "@workspace/api-client-react";

export default function PassportsPage() {
  const [search, setSearch] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [editPassport, setEditPassport] = useState<Passport | null>(null);
  const [deletePassportId, setDeletePassportId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParams = {
    ...(search ? { search } : {}),
    ...(nationalityFilter !== "all" ? { nationality: nationalityFilter } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {})
  };

  const { data: passports, isLoading } = useListPassports(queryParams, {
    query: {
      queryKey: getListPassportsQueryKey(queryParams)
    }
  });

  const deleteMutation = useDeletePassport();
  
  const handleDelete = () => {
    if (!deletePassportId) return;
    deleteMutation.mutate({ id: deletePassportId }, {
      onSuccess: () => {
        toast({ title: "Record deleted" });
        queryClient.invalidateQueries({ queryKey: getListPassportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPassportStatsQueryKey() });
        setDeletePassportId(null);
      },
      onError: () => {
        toast({ title: "Error deleting record", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Records</h1>
          <p className="text-muted-foreground mt-1">Manage and verify extracted passport data.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 border-b">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or passport number..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-records"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-nationality">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nationalities</SelectItem>
                  <SelectItem value="bangladesh">Bangladesh</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))
                ) : passports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  passports?.map((passport) => (
                    <TableRow key={passport.id} data-testid={`row-passport-${passport.id}`}>
                      <TableCell className="font-mono text-sm">{passport.passportNumber || "-"}</TableCell>
                      <TableCell className="font-medium uppercase">{passport.fullName || "-"}</TableCell>
                      <TableCell className="capitalize">{passport.nationality || "-"}</TableCell>
                      <TableCell>
                        {passport.status === "completed" && <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">COMPLETED</span>}
                        {passport.status === "processing" && <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">PROCESSING</span>}
                        {passport.status === "failed" && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">FAILED</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(passport.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${passport.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditPassport(passport)} data-testid={`menu-edit-${passport.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Record
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive" 
                              onClick={() => setDeletePassportId(passport.id)}
                              data-testid={`menu-delete-${passport.id}`}
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
        <EditDialog 
          passport={editPassport} 
          open={!!editPassport} 
          onOpenChange={(open) => !open && setEditPassport(null)} 
        />
      )}

      <AlertDialog open={!!deletePassportId} onOpenChange={(open) => !open && setDeletePassportId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the passport
              record from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditDialog({ passport, open, onOpenChange }: { passport: Passport; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMutation = useUpdatePassport();

  const form = useForm({
    defaultValues: {
      fullName: passport.fullName || "",
      passportNumber: passport.passportNumber || "",
      nationality: passport.nationality || "",
      dateOfBirth: passport.dateOfBirth || "",
      dateOfIssue: passport.dateOfIssue || "",
      dateOfExpiry: passport.dateOfExpiry || "",
      address: passport.address || "",
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({ id: passport.id, data }, {
      onSuccess: () => {
        toast({ title: "Record updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListPassportsQueryKey() });
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: "Failed to update record", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Passport Record</DialogTitle>
          <DialogDescription>
            Make manual corrections to the extracted OCR data.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="passportNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passport Number</FormLabel>
                    <FormControl>
                      <Input {...field} className="uppercase font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select nationality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bangladesh">Bangladesh</SelectItem>
                        <SelectItem value="india">India</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD or DD/MM/YYYY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfIssue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Issue</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD or DD/MM/YYYY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Expiry</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD or DD/MM/YYYY" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-record">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
