import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const editUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["VOLUNTEER", "TEAM_LEADER", "COUNTY_COORDINATOR", "SUPER_ADMIN"]).optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "INACTIVE"]).optional(),
  county: z.enum(["DOUGLAS", "SARPY", "BOTH"]).nullable().optional(),
  phone: z.string().nullable().optional(),
  churchId: z.string().nullable().optional(),
  churchNameAlt: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  backgroundCheckDate: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  let data: z.infer<typeof editUserSchema>;
  try {
    data = editUserSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    throw err;
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // County coordinators can only edit VOLUNTEER/TEAM_LEADER in their county
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
      // County coordinators cannot elevate roles above TEAM_LEADER
      if (data.role && !allowedRoles.includes(data.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Super admin cannot demote themselves from SUPER_ADMIN
    if (
      callerRole === "SUPER_ADMIN" &&
      session.user.id === id &&
      data.role &&
      data.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json({ error: "You cannot demote yourself from Super Admin." }, { status: 403 });
    }

    // Check email uniqueness if email is changing
    if (data.email && data.email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
      }
    }

    // Compute background check expiry if date provided
    let backgroundCheckExpiry: Date | null | undefined = undefined;
    if (data.backgroundCheckDate === null) {
      backgroundCheckExpiry = null;
    } else if (data.backgroundCheckDate) {
      const bgDate = new Date(data.backgroundCheckDate);
      backgroundCheckExpiry = new Date(bgDate);
      backgroundCheckExpiry.setFullYear(backgroundCheckExpiry.getFullYear() + 2);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.county !== undefined) updateData.county = data.county;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.churchId !== undefined) updateData.churchId = data.churchId;
    if (data.churchNameAlt !== undefined) updateData.churchNameAlt = data.churchNameAlt;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.backgroundCheckDate !== undefined) {
      updateData.backgroundCheckDate = data.backgroundCheckDate ? new Date(data.backgroundCheckDate) : null;
    }
    if (backgroundCheckExpiry !== undefined) updateData.backgroundCheckExpiry = backgroundCheckExpiry;

    await prisma.user.update({ where: { id }, data: updateData });

    await auditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "user.edit",
      targetId: id,
      targetType: "User",
      details: { fields: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Edit user error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot delete yourself
  if (session.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 403 });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Cannot delete the last SUPER_ADMIN
    if (target.role === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last Super Admin in the system." },
          { status: 403 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    await auditLog({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "user.delete",
      targetId: id,
      targetType: "User",
      details: { name: target.name, email: target.email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
