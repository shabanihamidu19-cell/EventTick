import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { verifyQrPayload } from "@/lib/qr";
import { z } from "zod";

const schema = z.object({
  qrData: z.string().min(10),
  eventId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Organizer access required" }, { status: 403 });
    }

    const body = await req.json();
    const { qrData, eventId } = schema.parse(body);

    const payload = verifyQrPayload(qrData);
    if (!payload) {
      return NextResponse.json({
        valid: false,
        reason: "INVALID_QR",
        message: "Invalid or tampered QR code",
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: payload.ticketId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        event: {
          select: {
            id: true,
            title: true,
            organizerId: true,
            status: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({
        valid: false,
        reason: "NOT_FOUND",
        message: "Ticket not found",
      });
    }

    if (user.role !== "ADMIN" && ticket.event.organizerId !== user.userId) {
      return NextResponse.json({
        valid: false,
        reason: "UNAUTHORIZED",
        message: "You are not the organizer of this event",
      });
    }

    if (eventId && ticket.eventId !== eventId) {
      return NextResponse.json({
        valid: false,
        reason: "WRONG_EVENT",
        message: "Ticket is for a different event",
      });
    }

    if (ticket.status === "USED") {
      return NextResponse.json({
        valid: false,
        reason: "ALREADY_USED",
        message: "Already scanned",
        ticket: {
          ticketCode: ticket.ticketCode,
          scannedAt: ticket.scannedAt?.toISOString(),
          holderName: ticket.user.name,
        },
      });
    }

    if (ticket.status !== "PAID") {
      return NextResponse.json({
        valid: false,
        reason: "NOT_PAID",
        message: `Ticket status: ${ticket.status}`,
      });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        scannedAt: new Date(),
        scannedById: user.userId,
      },
    });

    return NextResponse.json({
      valid: true,
      message: "Check-in successful",
      ticket: {
        ticketCode: updated.ticketCode,
        holderName: ticket.user.name || ticket.user.phone,
        eventTitle: ticket.event.title,
        scannedAt: updated.scannedAt?.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
