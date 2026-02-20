"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FellowRow {
  id: string;
  full_name: string;
  email: string | null;
  supervisor_id: string;
  created_at: string;
  supervisor_name: string;
}

export interface SupervisorOption {
  id: string;
  name: string;
}

interface FellowsTableProps {
  fellows: FellowRow[];
  supervisors: SupervisorOption[];
}

export function FellowsTable({ fellows, supervisors }: FellowsTableProps) {
  const [filterSupervisorId, setFilterSupervisorId] = useState<string>("all");

  const filtered =
    filterSupervisorId === "all"
      ? fellows
      : fellows.filter((f) => f.supervisor_id === filterSupervisorId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>All Fellows</CardTitle>
        <Select value={filterSupervisorId} onValueChange={setFilterSupervisorId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by supervisor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Supervisors</SelectItem>
            {supervisors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No fellows found.
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
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.full_name}</TableCell>
                  <TableCell>{f.email ?? "—"}</TableCell>
                  <TableCell>{f.supervisor_name}</TableCell>
                  <TableCell>
                    {new Date(f.created_at).toLocaleDateString("en-GB", {
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
