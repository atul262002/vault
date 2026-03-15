import { currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db";

export async function getCurrentDbUser() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!user || !email) {
    return null;
  }

  return prisma.user.upsert({
    where: { email },
    update: {
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User",
    },
    create: {
      email,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "User",
      isVerified: false,
    },
  });
}
