import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  followingId: z.string(),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const { followingId } = schema.parse(body);

  if (followingId === user.userId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: user.userId,
        followingId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({
    data: {
      followerId: user.userId,
      followingId,
    },
  });

  return NextResponse.json({ following: true });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ following: [] });
  }

  const follows = await prisma.follow.findMany({
    where: { followerId: user.userId },
    select: { followingId: true },
  });

  return NextResponse.json({
    following: follows.map((f) => f.followingId),
  });
}
