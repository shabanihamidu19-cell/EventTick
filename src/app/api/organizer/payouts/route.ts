import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payouts = await prisma.payout.findMany({
    where: { organizerId: user.userId },
    include: {
      event: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    payouts: payouts.map((p) => ({
      ...p,
      amount: Number(p.amount),
      commission: Number(p.commission),
      netAmount: Number(p.netAmount),
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt?.toISOString() || null,
    })),
  });
}
