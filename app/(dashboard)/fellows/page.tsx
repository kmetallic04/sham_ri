import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { FellowsTable, type FellowRow, type SupervisorOption } from "@/components/dashboard/fellows-table";
import { AddFellowDialog } from "@/components/dashboard/add-fellow-dialog";
import { FellowsSkeleton } from "@/components/dashboard/fellows-skeleton";

export default function FellowsPage() {
  return (
    <Suspense fallback={<FellowsSkeleton />}>
      <FellowsPageContent />
    </Suspense>
  );
}

async function FellowsPageContent() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");
  
  const supabase = await createClient();

  const [{ data: fellows }, supervisors] = await Promise.all([
    supabase
      .from("fellows")
      .select("id, full_name, email, supervisor_id, created_at, supervisors(profiles(first_name, last_name))")
      .order("created_at", { ascending: false }),
    fetchSupervisorOptions(),
  ]);

  const rows: FellowRow[] = (fellows ?? []).map((f) => {
    const sup = f.supervisors as unknown as {
      profiles: { first_name: string | null; last_name: string | null } | null;
    } | null;
    const profile = sup?.profiles;
    const supervisorName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"
      : "—";

    return {
      id: f.id,
      full_name: f.full_name,
      email: f.email,
      supervisor_id: f.supervisor_id,
      created_at: f.created_at,
      supervisor_name: supervisorName,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fellows</h2>
          <p className="text-muted-foreground">
            Manage fellows and their supervisor assignments.
          </p>
        </div>
        <AddFellowDialog supervisors={supervisors} />
      </div>
      <FellowsTable fellows={rows} supervisors={supervisors} />
    </div>
  );
}

async function fetchSupervisorOptions(): Promise<SupervisorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("supervisors")
    .select("id, profiles(first_name, last_name)");

  return (data ?? []).map((s) => {
    const profile = s.profiles as unknown as {
      first_name: string | null;
      last_name: string | null;
    } | null;
    return {
      id: s.id,
      name: profile
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unknown"
        : "Unknown",
    };
  });
}
