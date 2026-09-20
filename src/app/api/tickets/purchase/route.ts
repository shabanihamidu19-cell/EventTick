import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { initiateStkPush } from "@/lib/payment";
import { z } from "zod";

const schema = z.object({
  eventId: z.string(),
  phone: z.string().min(9),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const body = await req.json();
    const { eventId, phone, quantity } = schema.parse(body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status === "EXPIRED" || event.status === "CANCELLED") {
      return NextResponse.json({ error: "Event is no longer available" }, { status: 400 });
    }
    if (event.soldTickets + quantity > event.totalTickets) {
      return NextResponse.json({ error: "Not enough tickets available" }, { status: 400 });
    }

    const amount = Number(event.ticketPrice) * quantity;
    const normalizedPhone = phone.replace(/\s+/g, "").startsWith("+")
      ? phone.replace(/\s+/g, "")
      : `+255${phone.replace(/\s+/g, "").replace(/^0/, "")}`;

    const payment = await prisma.payment.create({
      data: {
        amount,
        currency: event.currency,
        status: "PENDING",
        phone: normalizedPhone,
        userId: user.userId,
        eventId: event.id,
      },
    });

    for (let i = 0; i < quantity; i++) {
      await prisma.ticket.create({
        data: {
          ticketCode: `ET-PENDING-${payment.id}-${i}`,
          qrData: "",
          status: "PENDING",
          pricePaid: event.ticketPrice,
          currency: event.currency,
          eventId: event.id,
          userId: user.userId,
          paymentId: payment.id,
        },
      });
    }

    const stk = await initiateStkPush({
      amount,
      phone: normalizedPhone,
      reference: payment.id,
      description: `Tickets for ${event.title}`,
    });

    if (!stk.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", gatewayResponse: stk.raw as object },
      });
      return NextResponse.json({ error: stk.message }, { status: 400 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalRef: stk.transactionId,
        gatewayResponse: stk.raw as object,
      },
    });

    const simulated =
      !process.env.PAYMENT_GATEWAY_API_KEY ||
      process.env.PAYMENT_GATEWAY_API_KEY === "your_payment_api_key";

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      transactionId: stk.transactionId,
      message: stk.message,
      amount,
      simulated,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Purchase failed" }, { status: 500 });
  }
}
