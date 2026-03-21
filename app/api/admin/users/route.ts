import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["VOLUNTEER", "TEAM_LEADER", "COUNTY_COORDINATOR", "SUPER_ADMIN"]),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "INACTIVE"]).default("APPROVED"),
  county: z.enum(["DOUGLAS", "SARPY", "BOTH"]).optional(),
  phone: z.string().optional(),
  churchId: z.string().optional(),
  churchNameAlt: z.string().optional(),
  adminNotes: z.string().optional(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callerRole = session.user.role;
  if (callerRole !== "SUPER_ADMIN" && callerRole !== "COUNTY_COORDINATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let data: CreateUserInput;
  try {
    data = createUserSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    throw err;
  }

  // County coordinators cannot create admin-level accounts
  if (
    callerRole === "COUNTY_COORDINATOR" &&
    (data.role === "SUPER_ADMIN" || data.role === "COUNTY_COORDINATOR")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
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
        password: hashedPassword,
        role: data.role,
        status: data.status,
        county: data.county ?? null,
        phone: data.phone || null,
        churchId: data.churchId || null,
        churchNameAlt: data.churchNameAlt || null,
        adminNotes: data.adminNotes || null,
      },
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
