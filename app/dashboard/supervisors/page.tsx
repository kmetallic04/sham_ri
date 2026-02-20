import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupervisorsSkeleton } from "@/components/dashboard/supervisors-skeleton";

export default function SupervisorsPage() {
  return (
    <Suspense fallback={<SupervisorsSkeleton />}>
      <SupervisorsPageContent />
    </Suspense>
  );
}

async function SupervisorsPageContent() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Supervisors</h2>
        <p className="text-muted-foreground">
          Users who signed up as supervisors.
        </p>
      </div>
      <SupervisorsList />
    </div>
  );
}

async function SupervisorsList() {
  const supabase = await createClient();

  const { data: supervisors } = await supabase
    .from("supervisors")
    .select("id, created_at, profiles(first_name, last_name, email)")
    .order("created_at", { ascending: false });

  const rows = supervisors ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Supervisors</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No supervisors found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const profile = s.profiles as unknown as {
                  first_name: string | null;
                  last_name: string | null;
                  email: string | null;
                } | null;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {profile
                        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "—"
                        : "—"}
                    </TableCell>
                    <TableCell>{profile?.email ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
