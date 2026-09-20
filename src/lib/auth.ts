import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import prisma from "./prisma";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-dev-secret-change-me"
);

export interface JWTPayload {
  userId: string;
  phone: string;
  role: string;
  name?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("eventtick_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getUserFromRequest(
  req: NextRequest
): Promise<JWTPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyToken(authHeader.slice(7));
  }
  const token = req.cookies.get("eventtick_token")?.value;
  if (token) return verifyToken(token);
  return null;
}

export async function requireAuth(
  req: NextRequest,
  roles?: string[]
): Promise<JWTPayload> {
  const user = await getUserFromRequest(req);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (roles && !roles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

/** Generate a 6-digit OTP */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Create and store OTP (dev mode logs it) */
export async function createOtp(phone: string, userId?: string) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt,
      userId,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] Phone: ${phone} | Code: ${code}`);
  }

  await sendSms(phone, `Your EventTick verification code is: ${code}. Valid for 10 minutes.`);

  return code;
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return true;
}

async function sendSms(phone: string, message: string) {
  const apiKey = process.env.SMS_GATEWAY_API_KEY;
  const baseUrl = process.env.SMS_GATEWAY_BASE_URL;
  const sender = process.env.SMS_GATEWAY_SENDER_ID || "EventTick";

  if (!apiKey || !baseUrl || apiKey === "your_sms_api_key") {
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(`${baseUrl}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        from: sender,
        message,
      }),
    });
    return { success: res.ok };
  } catch (err) {
    console.error("SMS send error:", err);
    return { success: false };
  }
}
