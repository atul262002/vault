"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  visitors: { label: "Deals success rate" },
  chrome: { label: "Failed", color: "hsl(var(--chart-1))" },
  safari: { label: "Completed", color: "hsl(var(--chart-2))" },
  firefox: { label: "Pending", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export function SellComponent() {
  const [chartData, setChartData] = React.useState([
    { browser: "Failed", visitors: 0, fill: "var(--color-chrome)" },
    { browser: "Completed", visitors: 0, fill: "var(--color-safari)" },
    { browser: "Pending", visitors: 0, fill: "var(--color-firefox)" },
  ]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/stats/charts");
        const data = await res.json();

        setChartData([
          { browser: "Failed", visitors: data.failed, fill: "var(--color-chrome)" },
          { browser: "Completed", visitors: data.completed, fill: "var(--color-safari)" },
          { browser: "Pending", visitors: data.pending, fill: "var(--color-firefox)" },
        ]);
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      }
    }
    fetchData();
  }, []);

  const totalVisitors = React.useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.visitors, 0),
    [chartData]
  );

  return (
    <Card className="flex flex-col p-4">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-base">Purchase Analytics</CardTitle>
        <CardDescription className="text-sm">Jan - June 2024</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={10}
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
                          className="fill-foreground text-xl font-bold"
                        >
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="fill-muted-foreground text-xs"
                        >
                          purchases
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
  
