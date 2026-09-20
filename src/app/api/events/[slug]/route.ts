import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const event = await prisma.event.findUnique({
    where: { slug: params.slug },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          businessName: true,
          avatarUrl: true,
          isKycVerified: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    event: {
      ...event,
      ticketPrice: Number(event.ticketPrice),
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
    },
  });
}
