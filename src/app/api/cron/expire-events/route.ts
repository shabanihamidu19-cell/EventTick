import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processEventPayout } from "@/lib/payment";

/**
 * Cron job: expire events past endDate and trigger payouts
 * Protect with CRON_SECRET header or query param
 * Call every 5–15 minutes from Vercel Cron / system cron / external scheduler
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const querySecret = new URL(req.url).searchParams.get("secret");

  if (secret && secret !== "your-cron-secret-token") {
    const provided =
      authHeader?.replace("Bearer ", "") || querySecret || "";
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  const toExpire = await prisma.event.findMany({
    where: {
      status: { in: ["UPCOMING", "LIVE"] },
      endDate: { lt: now },
    },
    select: { id: true, title: true },
  });

  const expiredIds: string[] = [];
  for (const e of toExpire) {
    await prisma.event.update({
      where: { id: e.id },
      data: { status: "EXPIRED" },
    });
    expiredIds.push(e.id);
  }

  await prisma.event.updateMany({
    where: {
      status: "UPCOMING",
      startDate: { lte: now },
      endDate: { gt: now },
    },
    data: { status: "LIVE" },
  });

  const payoutResults = [];
  for (const id of expiredIds) {
    try {
      const result = await processEventPayout(id);
      payoutResults.push({ eventId: id, ...result });
    } catch (err) {
      console.error(`Payout failed for ${id}:`, err);
      payoutResults.push({ eventId: id, error: String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    expiredCount: expiredIds.length,
    expiredIds,
    payouts: payoutResults,
    ranAt: now.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
