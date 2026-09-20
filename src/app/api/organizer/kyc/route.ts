import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  businessName: z.string().min(2).optional(),
  mobileMoneyNumber: z.string().min(9).optional(),
  bankAccount: z.string().optional(),
  kycDocumentUrl: z.string().url().optional(),
});

/**
 * KYC / payout details for organizers
 * In production, document upload would go to S3/Cloudinary first.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Organizer access required" }, { status: 403 });
  }

  const body = await req.json();
  const data = schema.parse(body);

  const updated = await prisma.user.update({
    where: { id: user.userId },
    data: {
      ...(data.businessName !== undefined && { businessName: data.businessName }),
      ...(data.mobileMoneyNumber !== undefined && {
        mobileMoneyNumber: data.mobileMoneyNumber,
      }),
      ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
      ...(data.kycDocumentUrl !== undefined && {
        kycDocumentUrl: data.kycDocumentUrl,
        isKycVerified: true,
      }),
    },
    select: {
      id: true,
      businessName: true,
      mobileMoneyNumber: true,
      bankAccount: true,
      isKycVerified: true,
      kycDocumentUrl: true,
    },
  });

  return NextResponse.json({ user: updated });
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      businessName: true,
      mobileMoneyNumber: true,
      bankAccount: true,
      isKycVerified: true,
      kycDocumentUrl: true,
    },
  });

  return NextResponse.json({ profile });
}
