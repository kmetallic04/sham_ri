import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/admin";
import { MetricCards, type StatusCounts } from "@/components/dashboard/metric-cards";
import { SessionsTable, type SessionRow, type SupervisorOption } from "@/components/dashboard/sessions-table";
import { StatusPieChart } from "@/components/dashboard/status-pie-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();

  const [userRole, { data: allStatuses }, { data: recentSessions }, { data: supervisorRows }] = await Promise.all([
    getCurrentUserRole(),
    supabase.from("sessions").select("status"),
    supabase
      .from("sessions")
      .select(`
        id, 
        session_date, 
        status, 
        reviewer_id, 
        fellows(id, full_name, supervisor_id, supervisors(profiles(first_name, last_name))), 
        groups(name),
        reviewers:supervisors!reviewer_id(profiles(first_name, last_name))
      `)
      .order("session_date", { ascending: false })
      .limit(10),
    supabase.from("supervisors").select("id, profiles(first_name, last_name)"),
  ]);

  const supervisorOptions: SupervisorOption[] = (supervisorRows ?? []).map((s) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const p = (s as any).profiles;
    return {
      id: s.id,
      name: p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown" : "Unknown",
    };
  });

  const statuses = allStatuses ?? [];
  const counts: StatusCounts = {
    total: statuses.length,
    pending: statuses.filter((s) => s.status === "pending").length,
    processed: statuses.filter((s) => s.status === "processed").length,
    flagged_for_review: statuses.filter(
      (s) => s.status === "flagged_for_review",
    ).length,
    safe: statuses.filter((s) => s.status === "safe").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of therapy session reviews and analysis.
        </p>
      </div>

      <MetricCards counts={counts} />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <SessionsTable
            sessions={(recentSessions ?? []) as unknown as SessionRow[]}
            userRole={userRole}
            supervisorOptions={supervisorOptions}
          />
        </div>
        <div className="lg:col-span-1">
          <StatusPieChart counts={counts} />
        </div>
      </div>
    </div>
  );
}
