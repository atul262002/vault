import NavDash from '@/components/dashboardComponents/nav-dash'
import Sidebar from '@/components/globalComponents/sidebar'
import React, { Suspense } from 'react'
import ViewProducts from "@/components/productComponents/product-dialog";
import { Navbar } from '@/components/globalComponents/navbar';
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <Navbar />
      <Suspense>
        <NavDash />
      </Suspense>
      <Sidebar>
        <Suspense>
        {children}
        </Suspense>
      </Sidebar>
    </div>
  )
}

export default DashboardLayout
