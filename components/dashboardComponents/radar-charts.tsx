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
  listings: {
    label: "Listings",
    color: "hsl(var(--chart-1))",
  },
  sold: {
    label: "Sold",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function RadarComponent() {
  const [chartData, setChartData] = React.useState<
    { city: string; listings: number; sold: number }[]
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
        <CardTitle>Event Location Analytics</CardTitle>
        <CardDescription>
          Showing how your listings are distributed by city.
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
            <PolarAngleAxis dataKey="city" />
            <PolarGrid />
            <Radar
              dataKey="listings"
              fill="var(--color-listings)"
              fillOpacity={0.6}
            />
            <Radar
              dataKey="sold"
              fill="var(--color-sold)"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
