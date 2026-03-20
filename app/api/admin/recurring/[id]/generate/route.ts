import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

const schema = z.object({
  weeksAhead: z.number().int().min(1).max(26).default(8),
});

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { weeksAhead } = schema.parse(body);

    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id },
      include: { mods: true },
    });
    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== schedule.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!schedule.isActive) {
      return NextResponse.json({ error: "Schedule is inactive." }, { status: 400 });
    }

    // Find the next occurrence of the target day of week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDow = schedule.dayOfWeek;
    let daysUntil = (targetDow - today.getDay() + 7) % 7;
    if (daysUntil === 0) daysUntil = 7; // start from the next occurrence, not today

    const visitDates: Date[] = [];
    for (let week = 0; week < weeksAhead; week++) {
      const d = new Date(today);
      d.setDate(today.getDate() + daysUntil + week * 7);
      visitDates.push(d);
    }

    let created = 0;
    let skipped = 0;

    for (const date of visitDates) {
      // Check if a visit from this schedule already exists on this date
      const existing = await prisma.visit.findFirst({
        where: {
          recurringScheduleId: schedule.id,
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.visit.create({
        data: {
          county: schedule.county,
          title: schedule.title,
          date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          notes: schedule.description,
          recurringScheduleId: schedule.id,
          visitMods: {
            create: schedule.mods.map((rsm) => ({
              modId: rsm.modId,
              maxVolunteers: rsm.maxVolunteers,
            })),
          },
        },
      });
      created++;
    }

    return NextResponse.json({
      message: `Generated ${created} visit${created !== 1 ? "s" : ""} (${skipped} already existed) for ${DAY_NAMES[targetDow]}s over the next ${weeksAhead} weeks.`,
      created,
      skipped,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
