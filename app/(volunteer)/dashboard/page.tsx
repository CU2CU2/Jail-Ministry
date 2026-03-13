import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDate, formatTime, COUNTY_LABELS } from "@/lib/utils";

export const metadata = { title: "Dashboard — Jail Ministry" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  // Upcoming visits the volunteer is signed up for
  const upcomingSignups = await prisma.visitSignup.findMany({
    where: {
      userId,
      status: "SIGNED_UP",
      visit: {
        date: { gte: new Date() },
        status: "SCHEDULED",
      },
    },
    include: {
      visit: true,
    },
    orderBy: { visit: { date: "asc" } },
    take: 5,
  });

  // Count total past attended visits
  const attendedCount = await prisma.visitSignup.count({
    where: { userId, status: "ATTENDED" },
  });

  // Upcoming visits open for sign-up in the volunteer's county
  const userCounty = session!.user.county;
  const openVisits = await prisma.visit.findMany({
    where: {
      status: "SCHEDULED",
      date: { gte: new Date() },
      ...(userCounty && userCounty !== "BOTH"
        ? { OR: [{ county: userCounty }, { county: "BOTH" as never }] }
        : {}),
      signups: {
        none: { userId },
      },
    },
    orderBy: { date: "asc" },
    take: 3,
    include: {
      _count: { select: { signups: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session!.user.name?.split(" ")[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {userCounty ? COUNTY_LABELS[userCounty] : "Jail Ministry Volunteer Portal"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <CalendarDays className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingSignups.length}</p>
              <p className="text-sm text-gray-500">Upcoming visits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendedCount}</p>
              <p className="text-sm text-gray-500">Visits attended</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming signed-up visits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Upcoming Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSignups.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <p>You have no upcoming visits scheduled.</p>
              <Link href="/schedule" className="text-blue-600 hover:underline mt-2 inline-block">
                Browse the schedule →
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {upcomingSignups.map(({ visit }) => (
                <li key={visit.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{visit.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(visit.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(visit.startTime)} – {formatTime(visit.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {visit.location}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary">{COUNTY_LABELS[visit.county]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Open visits to sign up for */}
      {openVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Visits — Sign Up Now</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {openVisits.map((visit) => {
                const spotsLeft = visit.volunteerCap - visit._count.signups;
                return (
                  <li key={visit.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{visit.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(visit.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(visit.startTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                      <Link
                        href={`/schedule`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Sign up →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 pt-3 border-t">
              <Link href="/schedule" className="text-sm text-blue-600 hover:underline">
                View full schedule →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
