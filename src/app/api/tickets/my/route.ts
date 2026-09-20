import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      userId: user.userId,
      status: { in: ["PAID", "USED"] },
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          startDate: true,
          endDate: true,
          venue: true,
          location: true,
          city: true,
          coverImageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      ...t,
      pricePaid: Number(t.pricePaid),
      createdAt: t.createdAt.toISOString(),
      scannedAt: t.scannedAt?.toISOString() || null,
      event: {
        ...t.event,
        startDate: t.event.startDate.toISOString(),
        endDate: t.event.endDate.toISOString(),
      },
    })),
  });
}
