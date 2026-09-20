import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const city = searchParams.get("city") || undefined;
  const category = searchParams.get("category") || undefined;
  const statusParam = searchParams.get("status") || "UPCOMING,LIVE";
  const organizerId = searchParams.get("organizerId") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const statuses = statusParam.split(",").map((s) => s.trim()) as (
    | "UPCOMING"
    | "LIVE"
    | "EXPIRED"
    | "CANCELLED"
  )[];

  const events = await prisma.event.findMany({
    where: {
      status: { in: statuses },
      ...(city ? { city } : {}),
      ...(category ? { category: category as never } : {}),
      ...(organizerId ? { organizerId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          businessName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
    take: limit,
  });

  const mapped = events.map((e) => ({
    ...e,
    ticketPrice: Number(e.ticketPrice),
    startDate: e.startDate.toISOString(),
    endDate: e.endDate.toISOString(),
  }));

  return NextResponse.json({ events: mapped });
}

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  location: z.string().min(2),
  city: z.string().min(2),
  venue: z.string().optional(),
  category: z.enum([
    "MUSIC",
    "BUSINESS",
    "SPORTS",
    "CAMPUS",
    "ARTS",
    "TECHNOLOGY",
    "FOOD",
    "OTHER",
  ]),
  startDate: z.string(),
  endDate: z.string(),
  ticketPrice: z.number().positive(),
  totalTickets: z.number().int().positive(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Organizer access required" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    let baseSlug = slugify(data.title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const event = await prisma.event.create({
      data: {
        title: data.title,
        slug,
        description: data.description,
        location: data.location,
        city: data.city,
        venue: data.venue || null,
        category: data.category,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        ticketPrice: data.ticketPrice,
        totalTickets: data.totalTickets,
        coverImageUrl: data.coverImageUrl || null,
        organizerId: user.userId,
        status: "UPCOMING",
      },
      include: {
        organizer: {
          select: { id: true, name: true, businessName: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({
      event: {
        ...event,
        ticketPrice: Number(event.ticketPrice),
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
