import { NextRequest, NextResponse } from "next/server";

import { getCurrentDbUser } from "@/lib/current-db-user";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

export async function GET(req: NextRequest) {
  const me = await getCurrentDbUser();
  if (!me) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`user-search:${me.id}`, 30, 60_000)) {
    return NextResponse.json({ message: "Too many searches. Please slow down." }, { status: 429 });
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, MAX_QUERY_LENGTH);

  // An empty or one-letter query would let anyone page through every
  // user's email address.
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { startsWith: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: 10,
  });

  return NextResponse.json(users);
}
