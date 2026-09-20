import { NextRequest, NextResponse } from "next/server";
import { createOtp } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  phone: z.string().min(9).max(15),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone } = schema.parse(body);

    // Normalize phone (basic)
    const normalized = phone.replace(/\s+/g, "").startsWith("+")
      ? phone.replace(/\s+/g, "")
      : `+255${phone.replace(/\s+/g, "").replace(/^0/, "")}`;

    await createOtp(normalized);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your phone",
      // In dev the code is logged server-side
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
