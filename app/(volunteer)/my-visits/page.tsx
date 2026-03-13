import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { formatDate, formatTime, COUNTY_LABELS } from "@/lib/utils";

export const metadata = { title: "My Visits — Jail Ministry" };

const SIGNUP_BADGE: Record<string, { label: string; variant: "success" | "destructive" | "secondary" | "pending" }> = {
  ATTENDED: { label: "Attended", variant: "success" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
  SIGNED_UP: { label: "Upcoming", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

export default async function MyVisitsPage() {
  const session = await auth();

  const signups = await prisma.visitSignup.findMany({
    where: { userId: session!.user.id },
    include: { visit: true },
    orderBy: { visit: { date: "desc" } },
  });

  const upcoming = signups.filter(
    (s) => new Date(s.visit.date) >= new Date() && s.status === "SIGNED_UP"
  );
  const past = signups.filter(
    (s) => new Date(s.visit.date) < new Date() || s.status !== "SIGNED_UP"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Visits</h1>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming ({upcoming.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {upcoming.map(({ id, visit }) => (
                <li key={id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{visit.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(visit.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(visit.startTime)}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{visit.location}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{COUNTY_LABELS[visit.county]}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visit History</CardTitle>
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No visit history yet.</p>
          ) : (
            <ul className="divide-y">
              {past.map(({ id, status, visit }) => {
                const badge = SIGNUP_BADGE[status] ?? { label: status, variant: "secondary" as const };
                return (
                  <li key={id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{visit.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(visit.date)}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{visit.location}</span>
                      </div>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
