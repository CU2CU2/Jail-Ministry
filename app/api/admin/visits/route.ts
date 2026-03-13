import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const county = searchParams.get("county");
  const status = searchParams.get("status") ?? "SCHEDULED";
  const upcoming = searchParams.get("upcoming") === "true";

  const coordinatorCounty = session.user.county;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const visits = await prisma.visit.findMany({
    where: {
      status: status as "SCHEDULED" | "COMPLETED" | "CANCELLED",
      ...(upcoming ? { date: { gte: new Date() } } : {}),
      ...(county ? { county: county as "DOUGLAS" | "SARPY" } : {}),
      ...(!isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
        ? { county: coordinatorCounty }
        : {}),
    },
    include: {
      visitMods: {
        include: {
          mod: true,
          signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
        },
        orderBy: { mod: { sortOrder: "asc" } },
      },
      teamLeader: { select: { id: true, name: true } },
      _count: { select: { signups: true } },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(visits);
}

const visitSchema = z.object({
  title: z.string().min(1),
  county: z.enum(["DOUGLAS", "SARPY"]),
  date: z.string(), // ISO date string
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().min(1),
  notes: z.string().optional(),
  teamLeaderId: z.string().optional(),
  recurringScheduleId: z.string().optional(),
  // Array of mod IDs to include in this visit
  modIds: z.array(z.string()).min(1, "Select at least one mod"),
  maxVolunteersPerMod: z.number().int().min(1).max(10).default(2),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = visitSchema.parse(body);

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== data.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const visit = await prisma.visit.create({
      data: {
        title: data.title,
        county: data.county,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        notes: data.notes,
        teamLeaderId: data.teamLeaderId || null,
        recurringScheduleId: data.recurringScheduleId || null,
        visitMods: {
          create: data.modIds.map((modId) => ({
            modId,
            maxVolunteers: data.maxVolunteersPerMod,
          })),
        },
      },
      include: {
        visitMods: { include: { mod: true } },
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
