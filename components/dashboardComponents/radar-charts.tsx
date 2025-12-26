"use client"

import * as React from "react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  desktop: {
    label: "Bought",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Sold",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function RadarComponent() {
  const [chartData, setChartData] = React.useState<
    { month: string; desktop: number; mobile: number }[]
  >([])

  React.useEffect(() => {
    fetch("/api/stats/charts/category")
      .then((res) => res.json())
      .then((data) => setChartData(data))
      .catch((err) => console.error("Failed to fetch chart data:", err))
  }, [])

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle>Category wise analytics</CardTitle>
        <CardDescription>
          Showing category wise purchase v/s sold.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto max-h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
              dataKey="desktop"
              fill="var(--color-desktop)"
              fillOpacity={0.6}
            />
            <Radar
              dataKey="mobile"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
