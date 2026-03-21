import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  let data: z.infer<typeof resetPasswordSchema>;
  try {
    data = resetPasswordSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    throw err;
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // County coordinators can only reset passwords for VOLUNTEER/TEAM_LEADER in their county
    if (callerRole === "COUNTY_COORDINATOR") {
      const allowedRoles = ["VOLUNTEER", "TEAM_LEADER"];
      if (!allowedRoles.includes(target.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        session.user.county !== "BOTH" &&
        target.county !== session.user.county &&
        target.county !== "BOTH"
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

    await auditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "user.reset_password",
      targetId: id,
      targetType: "User",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
