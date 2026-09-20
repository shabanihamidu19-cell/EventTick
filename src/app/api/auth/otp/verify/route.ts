import { NextRequest, NextResponse } from "next/server";
import { verifyOtp, createToken } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  phone: z.string().min(9),
  code: z.string().length(6),
  name: z.string().optional(),
  role: z.enum(["CUSTOMER", "ORGANIZER"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code, name, role } = schema.parse(body);

    const normalized = phone.replace(/\s+/g, "").startsWith("+")
      ? phone.replace(/\s+/g, "")
      : `+255${phone.replace(/\s+/g, "").replace(/^0/, "")}`;

    const valid = await verifyOtp(normalized, code);
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone: normalized } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalized,
          name: name || null,
          role: role || "CUSTOMER",
          isVerified: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          ...(name && !user.name ? { name } : {}),
        },
      });
    }

    const token = await createToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    });

    res.cookies.set("eventtick_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
