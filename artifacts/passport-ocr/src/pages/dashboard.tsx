import React from "react";
import { useGetPassportStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetPassportStats();

  const successRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">System Online</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Welcome to <span className="text-gradient-primary">LEO OS</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Your operational hub for passport extraction and Letter of Appointment generation.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/upload">
            <Button data-testid="button-quick-upload" className="shadow-sm">
              <FileText className="h-4 w-4 mr-2" /> New Document
            </Button>
          </Link>
        </div>
      </div>

      {/* Top metric strip */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Processed"
          value={stats?.total}
          icon={Activity}
          accent="indigo"
          isLoading={isLoading}
          hint="all time"
        />
        <MetricCard
          label="Completed"
          value={stats?.completed}
          icon={CheckCircle2}
          accent="emerald"
          isLoading={isLoading}
          hint={`${successRate}% success rate`}
        />
        <MetricCard
          label="In Queue"
          value={stats?.processing}
          icon={Clock}
          accent="amber"
          isLoading={isLoading}
          hint="processing"
        />
        <MetricCard
          label="Failed"
          value={stats?.failed}
          icon={XCircle}
          accent="rose"
          isLoading={isLoading}
          hint="needs review"
        />
      </div>

      {/* Two column: Nationality breakdown + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Nationality breakdown */}
        <Card className="lg:col-span-1 border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">By Nationality</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Distribution of records</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="space-y-4">
                <NationalityBar
                  label="Bangladesh"
                  value={stats?.bangladeshi ?? 0}
                  total={stats?.total ?? 0}
                  color="from-emerald-500 to-teal-500"
                />
                <NationalityBar
                  label="India"
                  value={stats?.indian ?? 0}
                  total={stats?.total ?? 0}
                  color="from-orange-500 to-amber-500"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Recent Activity
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Latest passport processing events</p>
              </div>
              <Link href="/passports">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : stats?.recentUploads && stats.recentUploads.length > 0 ? (
              <div className="space-y-1.5">
                {stats.recentUploads.slice(0, 6).map((passport) => (
                  <div
                    key={passport.id}
                    className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/15 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {passport.fullName || passport.originalFilename || "Untitled"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{passport.passportNumber || "—"}</span>
                          <span>·</span>
                          <span>{format(new Date(passport.createdAt), "MMM d, HH:mm")}</span>
                        </div>
                      </div>
                    </div>
                    <StatusPill status={passport.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Upload your first document to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ACCENT: Record<string, { ring: string; bg: string; text: string; iconBg: string }> = {
  indigo:  { ring: "ring-indigo-500/15", bg: "bg-indigo-500/5",  text: "text-indigo-600",  iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500" },
  emerald: { ring: "ring-emerald-500/15", bg: "bg-emerald-500/5", text: "text-emerald-600", iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500" },
  amber:   { ring: "ring-amber-500/15", bg: "bg-amber-500/5",   text: "text-amber-600",   iconBg: "bg-gradient-to-br from-amber-500 to-orange-500" },
  rose:    { ring: "ring-rose-500/15", bg: "bg-rose-500/5",    text: "text-rose-600",    iconBg: "bg-gradient-to-br from-rose-500 to-red-500" },
};

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  isLoading,
  hint,
}: {
  label: string;
  value?: number;
  icon: React.ElementType;
  accent: keyof typeof ACCENT;
  isLoading: boolean;
  hint?: string;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="border-border/60 shadow-sm overflow-hidden relative group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className={`h-8 w-8 rounded-lg ${a.iconBg} flex items-center justify-center shadow-sm`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-bold tracking-tight font-mono">
              {value ?? 0}
            </div>
            {hint && (
              <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NationalityBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          <span className="text-foreground font-semibold">{value}</span> · {pct}%
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string; dot: string }> = {
    completed:  { label: "Completed",  classes: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", dot: "bg-emerald-500" },
    processing: { label: "Processing", classes: "bg-amber-500/10 text-amber-700 border-amber-500/20",       dot: "bg-amber-500 animate-pulse" },
    failed:     { label: "Failed",     classes: "bg-rose-500/10 text-rose-700 border-rose-500/20",          dot: "bg-rose-500" },
  };
  const c = config[status] ?? { label: status, classes: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };
  return (
    <Badge variant="outline" className={`${c.classes} font-medium text-[10px] gap-1.5 px-2 py-0.5 rounded-full`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </Badge>
  );
}
