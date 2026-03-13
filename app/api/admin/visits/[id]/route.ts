import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      visitMods: {
        include: {
          mod: true,
          signups: {
            include: { user: { select: { id: true, name: true, email: true, church: true, churchNameAlt: true } } },
            where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
          },
        },
        orderBy: { mod: { sortOrder: "asc" } },
      },
      teamLeader: { select: { id: true, name: true } },
      recurringSchedule: true,
    },
  });

  if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  return NextResponse.json(visit);
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  teamLeaderId: z.string().nullable().optional(),
  // Full replacement of mods (if provided)
  modIds: z.array(z.string()).optional(),
  maxVolunteersPerMod: z.number().int().min(1).max(10).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const visit = await prisma.visit.findUnique({ where: { id: params.id } });
    if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== visit.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { modIds, maxVolunteersPerMod, ...rest } = updateSchema.parse(body);

    const updated = await prisma.visit.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(rest.date ? { date: new Date(rest.date) } : {}),
        ...(modIds !== undefined
          ? {
              visitMods: {
                // Remove mods that are no longer in the list (only if no signups)
                deleteMany: {
                  modId: { notIn: modIds },
                  signups: { none: {} },
                },
                // Add new mods
                upsert: modIds.map((modId) => ({
                  where: { visitId_modId: { visitId: params.id, modId } },
                  create: { modId, maxVolunteers: maxVolunteersPerMod ?? 2 },
                  update: maxVolunteersPerMod ? { maxVolunteers: maxVolunteersPerMod } : {},
                })),
              },
            }
          : {}),
      },
      include: {
        visitMods: { include: { mod: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Soft cancel instead of hard delete
  const visit = await prisma.visit.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json(visit);
}
