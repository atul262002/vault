"use client"
import { AreaComponent } from "@/components/dashboardComponents/area-chart";
import { BuyComponent } from "@/components/dashboardComponents/buy-chart";
import { RadarComponent } from "@/components/dashboardComponents/radar-charts";
import { SellComponent } from "@/components/dashboardComponents/sold-chart";
import ViewProducts from "@/components/productComponents/product-dialog";


export default function Page() {
  return (
    <div>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 w-full">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <BuyComponent />
          <RadarComponent />
        
        </div>
        <AreaComponent />
      </div>
      <ViewProducts />
    </div>
  )
}
