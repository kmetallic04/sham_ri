"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface GroupRow {
  id: string;
  name: string;
  created_at: string;
}

export function GroupsTable({ groups }: { groups: GroupRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Groups</CardTitle>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No groups found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>
                    {new Date(g.created_at).toLocaleDateString("en-GB", {
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
