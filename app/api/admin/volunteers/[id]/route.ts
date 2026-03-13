import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";

const updateSchema = z.object({
  action: z.enum(["approve", "reject"]),
  backgroundCheckDate: z.string().optional(),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "COUNTY_COORDINATOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, backgroundCheckDate, adminNotes, rejectionReason } = updateSchema.parse(body);

    const volunteer = await prisma.user.findUnique({ where: { id: params.id } });
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
        where: { id: params.id },
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
      sendApprovalEmail(volunteer.email, volunteer.name).catch(console.error);
    } else {
      await prisma.user.update({
        where: { id: params.id },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes ?? volunteer.adminNotes,
        },
      });
      sendRejectionEmail(volunteer.email, volunteer.name, rejectionReason).catch(console.error);
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
