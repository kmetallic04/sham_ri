import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserId,
  isCurrentUserSupervisor,
} from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FellowRow = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
  supervisor_name: string;
};

export default function MyFellowsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Fellows</h2>
        <p className="text-muted-foreground">
          Fellows currently assigned to you.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Loading fellows...
          </div>
        }
      >
        <MyFellowsPageContent />
      </Suspense>
    </div>
  );
}

async function MyFellowsPageContent() {
  const isSupervisor = await isCurrentUserSupervisor();
  if (!isSupervisor) redirect("/dashboard");

  const userId = await getCurrentUserId();
  if (!userId) redirect("/auth/login");

  const supabase = await createClient();
  const { data: fellows } = await supabase
    .from("fellows")
    .select("id, full_name, email, created_at, supervisors(profiles(first_name, last_name))")
    .eq("supervisor_id", userId)
    .order("created_at", { ascending: false });

  const rows = (fellows ?? []).map((f) => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
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
      created_at: f.created_at,
      supervisor_name: supervisorName,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Fellows</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No fellows are assigned to you yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((fellow) => (
                <TableRow key={fellow.id}>
                  <TableCell className="font-medium">{fellow.full_name}</TableCell>
                  <TableCell>{fellow.email ?? "—"}</TableCell>
                  <TableCell>{fellow.supervisor_name}</TableCell>
                  <TableCell>
                    {new Date(fellow.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
