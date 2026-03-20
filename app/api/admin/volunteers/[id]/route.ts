import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPendingNotificationEmail } from "@/lib/email";
import { auditLog } from "@/lib/audit";
import { notifyVolunteerApproved, notifyVolunteerRejected } from "@/lib/notifications";

const updateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  backgroundCheckDate: z.string().optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "COUNTY_COORDINATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, backgroundCheckDate, adminNotes, rejectionReason } = updateSchema.parse(body);

    const volunteer = await prisma.user.findUnique({ where: { id } });
    if (!volunteer) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

    // County Coordinators can only manage their own county
    if (
      role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      volunteer.county !== session.user.county &&
      volunteer.county !== "BOTH"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "approve") {
      await prisma.user.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNotes: adminNotes ?? volunteer.adminNotes,
          backgroundCheckDate: backgroundCheckDate ? new Date(backgroundCheckDate) : undefined,
          backgroundCheckExpiry: backgroundCheckDate
            ? new Date(
                new Date(backgroundCheckDate).setFullYear(
                  new Date(backgroundCheckDate).getFullYear() + 2
                )
              )
            : undefined,
        },
      });
      notifyVolunteerApproved(volunteer.id, volunteer.email, volunteer.name).catch(console.error);
      await auditLog({
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "volunteer.approve",
        targetId: volunteer.id,
        targetType: "User",
        details: { backgroundCheckDate },
      });
    } else {
      await prisma.user.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes ?? volunteer.adminNotes,
        },
      });
      notifyVolunteerRejected(volunteer.id, volunteer.email, volunteer.name, rejectionReason).catch(console.error);
      await auditLog({
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "volunteer.reject",
        targetId: volunteer.id,
        targetType: "User",
        details: { rejectionReason },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("Volunteer update error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
