import NavDash from '@/components/dashboardComponents/nav-dash'
import Sidebar from '@/components/globalComponents/sidebar'
import React, { Suspense } from 'react'
import { Navbar } from '@/components/globalComponents/navbar';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const DashboardLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const clerkUser = await currentUser();
  if (clerkUser?.emailAddresses[0]?.emailAddress) {
    const dbUser = await prisma.user.findUnique({
      where: { email: clerkUser.emailAddresses[0].emailAddress },
      select: { whatsappNumber: true },
    });
    // Redirect to onboarding if WhatsApp number is missing
    if (dbUser && !dbUser.whatsappNumber) {
      redirect('/onboarding');
    }
  }

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
