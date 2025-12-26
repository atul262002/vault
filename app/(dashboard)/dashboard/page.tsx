"use client";
import { TotalRevenueCard } from "@/components/productComponents/show-revenue";
import { AreaComponent } from "@/components/dashboardComponents/area-chart";
import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import ViewProducts from "@/components/productComponents/product-dialog";
import MyOrders from "@/components/orderComponents/myOrderComponent";
import ProductSearchByName from "@/components/productComponents/search-productby-name";
import axios from "axios";

export default function Page() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        earnings:0,
	pendingAmount:0,
	vaultRecovered:0
    })
   async function fetchStats() {
    try {
        const statsData = await axios.get("/api/stats");
        setStats({
            earnings: statsData.data.totalEarnings || 0,  // <-- use totalEarnings
            pendingAmount: statsData.data.pendingAmount || 0, // optional if you want
            vaultRecovered: statsData.data.vaultRecovered || 0
	});
    } catch (error) {
        console.error("Unable to fetch stats", error);
    }
}

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);
        fetchStats()
        return () => clearTimeout(timer);
    }, []);

    return (
        <div>
            {loading ? (
                <div className="flex justify-center items-center min-h-screen">
                    <span className="mr-2">
                        <Loader className="w-5 h-5 animate-spin" />
                    </span>
                    <span className="text-lg font-semibold ">
                        Loading assets
                    </span>
                </div>
            ) : (
                <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
                    <ProductSearchByName />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <TotalRevenueCard revenue={stats.earnings} title="Earnings" />
                        <TotalRevenueCard revenue={stats.pendingAmount} title="Pending Amount" />
                        <TotalRevenueCard revenue={stats.vaultRecovered} title="Vault Recovered" />
                    </div>
                    <div className="w-full overflow-x-auto">
                        <AreaComponent />
                    </div>
                    <div className="w-full overflow-x-auto">
                        <MyOrders />
                    </div>

                    <ViewProducts />
                </div>
            )}
        </div>
    );
}
