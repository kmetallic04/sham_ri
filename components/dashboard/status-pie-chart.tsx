"use client";

import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StatusCounts } from "./metric-cards";

const chartConfig = {
  count: { label: "Sessions" },
  pending: { label: "Pending", color: "hsl(var(--chart-1))" },
  processed: { label: "Processed", color: "hsl(var(--chart-2))" },
  flagged_for_review: { label: "Flagged", color: "hsl(var(--chart-3))" },
  safe: { label: "Safe", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

export function StatusPieChart({ counts }: { counts: StatusCounts }) {
  const data = [
    { status: "pending", count: counts.pending, fill: "var(--color-pending)" },
    {
      status: "processed",
      count: counts.processed,
      fill: "var(--color-processed)",
    },
    {
      status: "flagged_for_review",
      count: counts.flagged_for_review,
      fill: "var(--color-flagged_for_review)",
    },
    { status: "safe", count: counts.safe, fill: "var(--color-safe)" },
  ].filter((d) => d.count > 0);

  const total = counts.total;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Status</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data yet.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="status" hideLabel />}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {total}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground text-xs"
                          >
                            Sessions
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
