import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPendingNotificationEmail, sendVerificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  county: z.enum(["DOUGLAS", "SARPY", "BOTH"]),
  churchId: z.string().optional(),
  churchNameAlt: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`register:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Must provide either a church from the list or a manual name
    if (!data.churchId && !data.churchNameAlt) {
      return NextResponse.json(
        { error: "Please select or enter your church." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        county: data.county,
        address: data.address,
        churchId: data.churchId || null,
        churchNameAlt: data.churchNameAlt || null,
        role: "VOLUNTEER",
        status: "PENDING",
      },
    });

    // Create email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
    sendVerificationEmail(user.email, user.name, verificationToken).catch(console.error);

    // Notify county coordinator(s) of the new pending volunteer
    const coordinators = await prisma.user.findMany({
      where: {
        role: "COUNTY_COORDINATOR",
        status: "APPROVED",
        OR: [
          { county: data.county === "BOTH" ? undefined : data.county },
          { county: "BOTH" },
        ],
      },
      select: { email: true },
    });

    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", status: "APPROVED" },
      select: { email: true },
    });

    const notifyEmails = [
      ...coordinators.map((c) => c.email),
      ...superAdmins.map((a) => a.email),
    ];

    // Fire-and-forget — don't block the response on email delivery
    for (const email of notifyEmails) {
      sendPendingNotificationEmail(email, user.name, user.email).catch(console.error);
    }

    return NextResponse.json(
      { message: "Registration successful. Your application is pending approval." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
