import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { GroupsTable, type GroupRow } from "@/components/dashboard/groups-table";
import { AddGroupDialog } from "@/components/dashboard/add-group-dialog";
import { GroupsSkeleton } from "@/components/dashboard/groups-skeleton";

export default function GroupsPage() {
  return (
    <Suspense fallback={<GroupsSkeleton />}>
      <GroupsPageContent />
    </Suspense>
  );
}

async function GroupsPageContent() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Groups</h2>
          <p className="text-muted-foreground">
            Manage therapy groups.
          </p>
        </div>
        <AddGroupDialog />
      </div>
      <GroupsTable groups={(groups ?? []) as GroupRow[]} />
    </div>
  );
}
