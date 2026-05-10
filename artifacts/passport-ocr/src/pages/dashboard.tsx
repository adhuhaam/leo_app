import React from "react";
import {
  useGetPassportStats,
  useListExpenses,
  useListExpenseCategories,
  useListCompanies,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  TrendingUp,
  ArrowRight,
  Sparkles,
  UploadCloud,
  Users,
  Wallet,
  FileSignature,
  Building,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Link } from "wouter";

function formatMVR(n: number): string {
  return `MVR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetPassportStats();
  const { data: expenses = [] } = useListExpenses();
  const { data: expenseCategories = [] } = useListExpenseCategories();
  const { data: companies = [] } = useListCompanies();

  const successRate =
    stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  // Last 7 days for the mini bar chart
  const recentExpenseSeries = React.useMemo(() => {
    const days: { date: string; total: number; label: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        date: iso,
        total: 0,
        label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      });
    }
    for (const e of expenses) {
      if (!e.expenseDate) continue;
      const day = days.find((d) => d.date === e.expenseDate);
      if (day) day.total += Number(e.amount || 0);
    }
    return days;
  }, [expenses]);
  const seriesMax = Math.max(1, ...recentExpenseSeries.map((d) => d.total));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero — gradient surface with system status, headline, and CTAs */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-sm">
        {/* Decorative gradient + grid pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-emerald-500/10" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative px-6 md:px-8 py-7 md:py-9 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                System Online
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-emerald-600 bg-clip-text text-transparent">
                LEO OS
              </span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl">
              Your operational hub for passport extraction, Letter of Appointment generation,
              and expense tracking — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/upload">
              <Button data-testid="button-quick-upload" className="shadow-sm gap-2">
                <UploadCloud className="h-4 w-4" /> New Document
              </Button>
            </Link>
            <Link href="/loa">
              <Button variant="outline" className="gap-2 backdrop-blur-sm bg-background/60">
                <FileSignature className="h-4 w-4" /> New LOA
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick navigation tiles */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <QuickTile
          to="/upload"
          label="Process"
          hint="OCR a passport"
          icon={UploadCloud}
          gradient="from-indigo-500 to-violet-500"
        />
        <QuickTile
          to="/master-list"
          label="Master List"
          hint={`${stats?.total ?? 0} records`}
          icon={Users}
          gradient="from-sky-500 to-cyan-500"
        />
        <QuickTile
          to="/loa"
          label="Letters"
          hint={`${companies.length} companies`}
          icon={FileSignature}
          gradient="from-amber-500 to-orange-500"
        />
        <QuickTile
          to="/expenses"
          label="Expenses"
          hint={formatMVR(totalExpenses)}
          icon={Wallet}
          gradient="from-emerald-500 to-teal-500"
        />
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

      {/* Three-column row: Nationality + Expenses snapshot + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Nationality breakdown */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <SectionHeader
              title="By Nationality"
              hint="Distribution of records"
              icon={TrendingUp}
            />
            {isLoading ? (
              <div className="space-y-4 mt-5">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="space-y-4 mt-5">
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

        {/* Expenses snapshot — total + last 7 days mini chart */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <SectionHeader
              title="Expenses"
              hint="Last 7 days"
              icon={Wallet}
              right={
                <Link href="/expenses">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    Open <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              }
            />
            <div className="mt-5">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {formatMVR(totalExpenses)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {expenses.length} entries · {expenseCategories.length} categories
              </p>
              {/* Mini bar chart */}
              <div className="mt-5 flex items-end gap-1.5 h-20">
                {recentExpenseSeries.map((d, i) => {
                  const heightPct = d.total > 0 ? Math.max(8, (d.total / seriesMax) * 100) : 4;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full h-full flex items-end">
                        <div
                          className={`w-full rounded-md transition-all ${
                            d.total > 0
                              ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                              : "bg-muted"
                          }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${d.date}: ${formatMVR(d.total)}`}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies snapshot */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <SectionHeader
              title="Companies"
              hint="On record"
              icon={Building}
              right={
                <Link href="/settings">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    Manage <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              }
            />
            <div className="mt-5">
              <div className="text-3xl font-bold tracking-tight tabular-nums">
                {companies.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Active organizations
              </p>
              <div className="mt-4 space-y-1.5">
                {companies.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/40"
                  >
                    <div className="h-6 w-6 rounded bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {c.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <span className="truncate flex-1 font-medium">{c.name}</span>
                  </div>
                ))}
                {companies.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No companies yet.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity — full width row */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <SectionHeader
            title="Recent Activity"
            hint="Latest passport processing events"
            icon={Sparkles}
            right={
              <Link href="/passports">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            }
          />
          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : stats?.recentUploads && stats.recentUploads.length > 0 ? (
              <div className="grid gap-1.5 md:grid-cols-2">
                {stats.recentUploads.slice(0, 6).map((passport) => (
                  <div
                    key={passport.id}
                    className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors border border-transparent hover:border-border/60"
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
                          <span className="font-mono">
                            {passport.passportNumber || "—"}
                          </span>
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
                <p className="text-sm font-medium text-muted-foreground">
                  No activity yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Upload your first document to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ACCENT: Record<
  string,
  { ring: string; bg: string; text: string; iconBg: string; glow: string }
> = {
  indigo:  { ring: "ring-indigo-500/15",  bg: "bg-indigo-500/5",  text: "text-indigo-600",  iconBg: "bg-gradient-to-br from-indigo-500 to-violet-500",  glow: "from-indigo-500/10" },
  emerald: { ring: "ring-emerald-500/15", bg: "bg-emerald-500/5", text: "text-emerald-600", iconBg: "bg-gradient-to-br from-emerald-500 to-teal-500",   glow: "from-emerald-500/10" },
  amber:   { ring: "ring-amber-500/15",   bg: "bg-amber-500/5",   text: "text-amber-600",   iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",   glow: "from-amber-500/10" },
  rose:    { ring: "ring-rose-500/15",    bg: "bg-rose-500/5",    text: "text-rose-600",    iconBg: "bg-gradient-to-br from-rose-500 to-red-500",       glow: "from-rose-500/10" },
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
    <Card className="border-border/60 shadow-sm overflow-hidden relative group hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Hover glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div
            className={`h-9 w-9 rounded-lg ${a.iconBg} flex items-center justify-center shadow-sm`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
              {value ?? 0}
            </div>
            {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function QuickTile({
  to,
  label,
  hint,
  icon: Icon,
  gradient,
}: {
  to: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <Link href={to}>
      <button
        type="button"
        className="w-full text-left group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
        data-testid={`tile-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm flex-shrink-0`}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </div>
      </button>
    </Link>
  );
}

function SectionHeader({
  title,
  hint,
  icon: Icon,
  right,
}: {
  title: string;
  hint: string;
  icon: React.ElementType;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</p>
        </div>
      </div>
      {right}
    </div>
  );
}

function NationalityBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
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
  const c =
    config[status] ?? {
      label: status,
      classes: "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
    };
  return (
    <Badge
      variant="outline"
      className={`${c.classes} font-medium text-[10px] gap-1.5 px-2 py-0.5 rounded-full`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </Badge>
  );
}
