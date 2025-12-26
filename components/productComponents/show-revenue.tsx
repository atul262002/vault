import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { Separator } from "../ui/separator";

export function TotalRevenueCard({ revenue, title }: { revenue: number, title: string }) {
    return (
        <Card className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-4 sm:p-6 md:p-8 shadow-md">
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center font-semibold text-primary">
                    <Wallet className="rounded-full mr-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                    {title}
                </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent>
                <p className="text-3xl sm:text-4xl md:text-5xl font-bold dark:text-white text-black">
                    {title === "Vault Recovered"
                        ? revenue.toLocaleString()
                        : `₹${revenue.toLocaleString()}`}
                </p>
            </CardContent>
        </Card>
    );
}

