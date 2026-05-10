import React from "react";
import { useGetPassportStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CheckCircle2, Clock, XCircle, Globe, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetPassportStats();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of document extraction operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Processed"
          value={stats?.total}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Successfully Extracted"
          value={stats?.completed}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="In Queue"
          value={stats?.processing}
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Failed Extractions"
          value={stats?.failed}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Bangladesh Passports"
          value={stats?.bangladeshi}
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Indian Passports"
          value={stats?.indian}
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.recentUploads && stats.recentUploads.length > 0 ? (
            <div className="divide-y divide-border">
              {stats.recentUploads.map((passport) => (
                <div key={passport.id} className="py-3 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium font-mono text-sm text-foreground">
                      {passport.passportNumber || "Pending..."}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(passport.createdAt), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {passport.fullName || passport.originalFilename}
                    </span>
                    <div className="w-24 text-right">
                      {getStatusBadge(passport.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No recent activity found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, isLoading }: { title: string; value?: number; icon: React.ReactNode; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold font-mono">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
