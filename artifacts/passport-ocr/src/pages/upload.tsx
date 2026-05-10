import React, { useState, useRef, useEffect } from "react";
import { useUploadPassport, useGetPassport, getGetPassportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, File, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [activePassportId, setActivePassportId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadMutation = useUploadPassport();

  const { data: passport, isSuccess, error } = useGetPassport(activePassportId as number, {
    query: {
      enabled: !!activePassportId,
      queryKey: getGetPassportQueryKey(activePassportId as number),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data && (data.status === "completed" || data.status === "failed")) {
          return false;
        }
        return 2000; // poll every 2 seconds
      }
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WEBP or PDF file.",
        variant: "destructive"
      });
      return;
    }
    setFile(selectedFile);
    setActivePassportId(null);
  };

  const handleUpload = () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadMutation.mutate({ data: formData as any }, {
      onSuccess: (data) => {
        toast({
          title: "Upload successful",
          description: "Document queued for processing.",
        });
        setActivePassportId(data.id);
      },
      onError: () => {
        toast({
          title: "Upload failed",
          description: "There was an error uploading the document.",
          variant: "destructive"
        });
      }
    });
  };

  const reset = () => {
    setFile(null);
    setActivePassportId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Process Document</h1>
        <p className="text-muted-foreground mt-1">Upload a passport image or PDF for AI OCR extraction.</p>
      </div>

      {!activePassportId ? (
        <Card>
          <CardContent className="pt-6">
            <div 
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
                ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-card'}
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
              
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Drop document here</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Accepts JPEG, PNG, WEBP, and PDF. Maximum file size 10MB.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-browse">
                    Browse Files
                  </Button>
                </div>
              </div>
            </div>

            {file && (
              <div className="mt-6 flex items-center justify-between p-4 border rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
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
                  >
                    {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Begin Processing
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {passport?.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                {passport?.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {passport?.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-500" />}
                Document Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-muted-foreground">File: {file?.name || passport?.originalFilename}</span>
                <BadgeStatus status={passport?.status || 'processing'} />
              </div>
              
              {passport?.status === 'failed' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Extraction Failed</AlertTitle>
                  <AlertDescription>
                    {passport.errorMessage || "An unknown error occurred during OCR processing."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {passport?.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
                <CardDescription>Review the extracted information below.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                  <DataRow label="Full Name" value={passport.fullName} />
                  <DataRow label="Passport Number" value={passport.passportNumber} />
                  <DataRow label="Nationality" value={passport.nationality} />
                  <DataRow label="Date of Birth" value={passport.dateOfBirth} />
                  <DataRow label="Date of Issue" value={passport.dateOfIssue} />
                  <DataRow label="Date of Expiry" value={passport.dateOfExpiry} />
                  <div className="col-span-1 md:col-span-2">
                    <DataRow label="Address" value={passport.address} />
                  </div>
                </dl>
                <div className="mt-8">
                  <Button onClick={reset}>Process Another Document</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-b pb-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium text-foreground uppercase tracking-wide font-mono">
        {value || <span className="text-muted-foreground/50 italic">Not detected</span>}
      </dd>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  if (status === "completed") return <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-mono border-transparent bg-green-100 text-green-800">COMPLETED</span>;
  if (status === "processing") return <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-mono border-transparent bg-blue-100 text-blue-800 animate-pulse">PROCESSING</span>;
  if (status === "failed") return <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-mono border-transparent bg-red-100 text-red-800">FAILED</span>;
  return <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-mono">{status}</span>;
}
