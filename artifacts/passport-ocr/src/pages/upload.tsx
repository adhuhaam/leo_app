import React, { useState, useRef } from "react";
import { useUploadPassport, useGetPassport, getGetPassportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UploadCloud,
  File as FileIcon,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [activePassportId, setActivePassportId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const uploadMutation = useUploadPassport();

  const { data: passport } = useGetPassport(activePassportId as number, {
    query: {
      enabled: !!activePassportId,
      queryKey: getGetPassportQueryKey(activePassportId as number),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === "completed" || data.status === "failed")) return false;
        return 2000;
      },
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WEBP or PDF file.",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);
    setActivePassportId(null);
  };

  const handleUpload = () => {
    if (!file) return;
    uploadMutation.mutate(
      { data: { file } },
      {
        onSuccess: (data) => {
          toast({ title: "Upload successful", description: "Document queued for processing." });
          setActivePassportId(data.id);
        },
        onError: () =>
          toast({ title: "Upload failed", description: "There was an error uploading the document.", variant: "destructive" }),
      }
    );
  };

  const reset = () => {
    setFile(null);
    setActivePassportId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">AI Vision · GPT</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Process Document</h1>
        <p className="text-muted-foreground mt-2">Upload a passport image or PDF — fields are extracted automatically.</p>
      </div>

      {!activePassportId ? (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div
              className={`relative rounded-xl border-2 border-dashed p-10 md:p-16 text-center transition-all duration-200
                ${dragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border bg-gradient-to-b from-muted/30 to-transparent hover:border-primary/40 hover:bg-muted/40"
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={handleChange}
              />

              <div className="mx-auto flex max-w-[460px] flex-col items-center justify-center text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 blur-xl" />
                  <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <UploadCloud className="h-9 w-9 text-white" />
                  </div>
                </div>
                <h3 className="mt-6 text-lg md:text-xl font-semibold tracking-tight">
                  Drop your document here
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  or click to browse · Supports JPEG, PNG, WEBP, PDF · Max 20MB
                </p>
                <Button
                  className="mt-5 shadow-sm"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse"
                >
                  <UploadCloud className="h-4 w-4 mr-2" /> Browse Files
                </Button>
                <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-500" /> Secure
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-violet-500" /> GPT Vision
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-amber-500" /> ~5s avg
                  </span>
                </div>
              </div>
            </div>

            {file && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4 border border-border/60 rounded-lg bg-card shadow-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <FileIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-submit-upload"
                    className="shadow-sm"
                  >
                    {uploadMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Sparkles className="mr-2 h-3.5 w-3.5" /> Begin Extraction</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Status hero */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm
                    ${passport?.status === "completed" ? "bg-gradient-to-br from-emerald-500 to-teal-500" :
                      passport?.status === "failed" ? "bg-gradient-to-br from-rose-500 to-red-500" :
                      "bg-gradient-to-br from-amber-500 to-orange-500"}`}>
                    {passport?.status === "processing" && <Loader2 className="h-5 w-5 text-white animate-spin" />}
                    {passport?.status === "completed" && <CheckCircle2 className="h-5 w-5 text-white" />}
                    {passport?.status === "failed" && <AlertCircle className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {passport?.status === "processing" && "Extracting data..."}
                      {passport?.status === "completed" && "Extraction complete"}
                      {passport?.status === "failed" && "Extraction failed"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {file?.name || passport?.originalFilename}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={reset} data-testid="button-process-another">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> New Document
                </Button>
              </div>

              {passport?.status === "failed" && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Extraction Failed</AlertTitle>
                  <AlertDescription>
                    {passport.errorMessage || "An unknown error occurred during OCR processing."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Extracted data */}
          {passport?.status === "completed" && (
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight">Extracted Data</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Fields detected from the document</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <DataRow label="Full Name" value={passport.fullName} />
                  <DataRow label="Passport Number" value={passport.passportNumber} mono />
                  <DataRow label="Nationality" value={passport.nationality} />
                  <DataRow label="Date of Birth" value={passport.dateOfBirth} />
                  <DataRow label="Date of Issue" value={passport.dateOfIssue} />
                  <DataRow label="Date of Expiry" value={passport.dateOfExpiry} />
                  <div className="col-span-1 md:col-span-2">
                    <DataRow label="Address" value={passport.address} />
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 pb-3 border-b border-border/60">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium text-foreground ${mono ? "font-mono uppercase tracking-wide" : ""}`}>
        {value || <span className="text-muted-foreground/50 italic font-normal normal-case">Not detected</span>}
      </dd>
    </div>
  );
}
