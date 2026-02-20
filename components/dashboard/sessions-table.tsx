"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionInsightDialog } from "./session-insight-dialog";

export interface SupervisorOption {
  id: string;
  name: string;
}

export interface SessionRow {
  id: string;
  session_date: string;
  status: string;
  reviewer_id: string | null;
  fellows: {
    id: string;
    full_name: string;
    supervisor_id: string;
    supervisors: {
      profiles: { first_name: string; last_name: string } | null;
    } | null;
  } | null;
  groups: { name: string } | null;
  reviewers: {
    profiles: { first_name: string; last_name: string } | null;
  } | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "processed":
      return <Badge variant="secondary">Processed</Badge>;
    case "flagged_for_review":
      return <Badge variant="destructive">Flagged</Badge>;
    case "safe":
      return (
        <Badge className="border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400">
          Safe
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function SessionTableRows({
  sessions,
  onRowClick,
}: {
  sessions: SessionRow[];
  onRowClick: (session: SessionRow) => void;
}) {
  if (sessions.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
          No sessions found.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {sessions.map((session) => {
        const reviewerProfile = session.reviewers?.profiles;
        const reviewerName = reviewerProfile
          ? `${reviewerProfile.first_name ?? ""} ${reviewerProfile.last_name ?? ""}`.trim() || "—"
          : "—";

        return (
          <TableRow
            key={session.id}
            className="cursor-pointer"
            onClick={() => onRowClick(session)}
          >
            <TableCell className="font-medium">
              {session.fellows?.full_name ?? "Unknown"}
            </TableCell>
            <TableCell>
              {new Date(session.session_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
            <TableCell>{session.groups?.name ?? "\u2014"}</TableCell>
            <TableCell>{reviewerName}</TableCell>
            <TableCell>
              <StatusBadge status={session.status} />
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

export function SessionsTable({
  sessions,
  userRole,
  supervisorOptions,
}: {
  sessions: SessionRow[];
  userRole: "admin" | "supervisor" | null;
  supervisorOptions: SupervisorOption[];
}) {
  const router = useRouter();
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingSessions = sessions.filter((s) => s.status === "pending");
  const recentSessions = sessions.filter((s) => s.status !== "pending");

  function handleRowClick(session: SessionRow) {
    setSelectedSession(session);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Pending Section */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-l-4 border-green-500 pl-6 ml-8 py-2">
            <div className="flex-1">
              <CardTitle>Pending Sessions</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {userRole === "admin"
                  ? "All sessions awaiting review"
                  : "Sessions assigned to me for review or sessions assigned to my fellows"}
              </CardDescription>
            </div>
            <GripVertical className="size-5 text-muted-foreground shrink-0 mt-1" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fellow</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Assigned Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SessionTableRows sessions={pendingSessions} onRowClick={handleRowClick} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Section */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-l-4 border-blue-500 pl-6 ml-8 py-2">
            <div className="flex-1">
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {userRole === "admin"
                  ? "All session activity"
                  : "Recent session activity from me or my fellows"}
              </CardDescription>
            </div>
            <GripVertical className="size-5 text-muted-foreground shrink-0 mt-1" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fellow</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Assigned Supervisor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SessionTableRows sessions={recentSessions} onRowClick={handleRowClick} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <SessionInsightDialog
        session={selectedSession}
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        userRole={userRole}
        supervisorOptions={supervisorOptions}
      />
    </>
  );
}
