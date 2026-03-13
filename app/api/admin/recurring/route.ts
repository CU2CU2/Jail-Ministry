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
  const coordinatorCounty = session.user.county;
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const schedules = await prisma.recurringSchedule.findMany({
    where: {
      ...(county ? { county: county as "DOUGLAS" | "SARPY" } : {}),
      ...(!isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
        ? { county: coordinatorCounty }
        : {}),
    },
    include: {
      mods: { include: { mod: true }, orderBy: { mod: { sortOrder: "asc" } } },
      _count: { select: { visits: true } },
    },
    orderBy: [{ county: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(schedules);
}

const createSchema = z.object({
  title: z.string().min(1),
  county: z.enum(["DOUGLAS", "SARPY"]),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().min(1),
  description: z.string().optional(),
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
    const data = createSchema.parse(body);

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== data.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const schedule = await prisma.recurringSchedule.create({
      data: {
        title: data.title,
        county: data.county,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        description: data.description,
        mods: {
          create: data.modIds.map((modId) => ({
            modId,
            maxVolunteers: data.maxVolunteersPerMod,
          })),
        },
      },
      include: {
        mods: { include: { mod: true } },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
