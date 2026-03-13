import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const county = searchParams.get("county");
  const userId = session.user.id;
  const userCounty = session.user.county;

  const visits = await prisma.visit.findMany({
    where: {
      status: "SCHEDULED",
      date: { gte: new Date() },
      ...(county
        ? { county: county as "DOUGLAS" | "SARPY" }
        : userCounty && userCounty !== "BOTH"
        ? { county: userCounty }
        : {}),
    },
    include: {
      visitMods: {
        include: {
          mod: true,
          signups: {
            where: { status: { in: ["SIGNED_UP", "ATTENDED"] } },
            select: { id: true, userId: true, status: true },
          },
        },
        orderBy: { mod: { sortOrder: "asc" } },
      },
    },
    orderBy: { date: "asc" },
  });

  // Shape the response: add computed fields per visitMod
  const shaped = visits.map((visit) => ({
    id: visit.id,
    title: visit.title,
    county: visit.county,
    date: visit.date,
    startTime: visit.startTime,
    endTime: visit.endTime,
    location: visit.location,
    notes: visit.notes,
    mods: visit.visitMods.map((vm) => {
      const activeSignups = vm.signups.filter((s) => s.status === "SIGNED_UP");
      const mySignup = vm.signups.find((s) => s.userId === userId) ?? null;
      return {
        visitModId: vm.id,
        modId: vm.modId,
        modName: vm.mod.name,
        maxVolunteers: vm.maxVolunteers,
        signupCount: activeSignups.length,
        isFull: activeSignups.length >= vm.maxVolunteers,
        mySignup: mySignup ? { id: mySignup.id, status: mySignup.status } : null,
      };
    }),
    // Is the current user signed up for any mod in this visit?
    myVisitSignup: visit.visitMods
      .flatMap((vm) => vm.signups)
      .find((s) => s.userId === userId) ?? null,
  }));

  return NextResponse.json(shaped);
}
