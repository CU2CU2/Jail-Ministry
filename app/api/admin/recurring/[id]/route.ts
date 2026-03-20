import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  modIds: z.array(z.string()).optional(),
  maxVolunteersPerMod: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schedule = await prisma.recurringSchedule.findUnique({ where: { id } });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== schedule.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { modIds, maxVolunteersPerMod, ...rest } = updateSchema.parse(body);

    const updated = await prisma.recurringSchedule.update({
      where: { id },
      data: {
        ...rest,
        ...(modIds !== undefined
          ? {
              mods: {
                deleteMany: { modId: { notIn: modIds } },
                upsert: modIds.map((modId) => ({
                  where: { recurringScheduleId_modId: { recurringScheduleId: id, modId } },
                  create: { modId, maxVolunteers: maxVolunteersPerMod ?? 2 },
                  update: maxVolunteersPerMod ? { maxVolunteers: maxVolunteersPerMod } : {},
                })),
              },
            }
          : {}),
      },
      include: { mods: { include: { mod: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schedule = await prisma.recurringSchedule.findUnique({ where: { id } });
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.user.role === "COUNTY_COORDINATOR" &&
    session.user.county !== "BOTH" &&
    session.user.county !== schedule.county
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.recurringSchedule.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Schedule deactivated." });
}
