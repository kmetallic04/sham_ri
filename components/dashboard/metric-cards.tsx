import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

export interface StatusCounts {
  total: number;
  pending: number;
  processed: number;
  flagged_for_review: number;
  safe: number;
}

const metrics = [
  { key: "total" as const, title: "Total Sessions", icon: FileText },
  { key: "pending" as const, title: "Pending Review", icon: Clock },
  {
    key: "flagged_for_review" as const,
    title: "Flagged for Review",
    icon: AlertTriangle,
  },
  { key: "safe" as const, title: "Safe", icon: ShieldCheck },
];

export function MetricCards({ counts }: { counts: StatusCounts }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map(({ key, title, icon: Icon }) => (
        <Card key={key} className="gap-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardAction>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{counts[key]}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
