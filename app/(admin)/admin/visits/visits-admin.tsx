"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Visit, VisitMod, Mod, User, VisitSignup, UserCounty } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, Clock, MapPin, Users, XCircle } from "lucide-react";
import { formatDate, formatTime, COUNTY_LABELS } from "@/lib/utils";

type VisitWithMods = Visit & {
  visitMods: (VisitMod & {
    mod: Mod;
    signups: VisitSignup[];
  })[];
  teamLeader: Pick<User, "id" | "name"> | null;
};

interface Props {
  visits: VisitWithMods[];
  isSuperAdmin: boolean;
  coordinatorCounty: UserCounty | null;
  currentStatus: string;
}

const STATUS_TABS = [
  { value: "SCHEDULED", label: "Upcoming" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function VisitsAdmin({ visits, currentStatus }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (id: string, title: string) => {
    if (!confirm(`Cancel the visit "${title}"? Signed-up volunteers will still need to be notified separately.`)) return;
    setCancelling(id);
    await fetch(`/api/admin/visits/${id}`, { method: "DELETE" });
    setCancelling(null);
    router.refresh();
  };

  return (
    <>
      {/* Tabs + Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-1 border-b">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => router.push(`/admin/visits?status=${tab.value}`)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentStatus === tab.value
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/visits/new">
            <Plus className="h-4 w-4" />
            Create Visit
          </Link>
        </Button>
      </div>

      {/* Visit list */}
      {visits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No visits found.{" "}
            {currentStatus === "SCHEDULED" && (
              <Link href="/admin/visits/new" className="text-blue-600 hover:underline">
                Create one
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => {
            const totalSlots = visit.visitMods.reduce((sum, vm) => sum + vm.maxVolunteers, 0);
            const filledSlots = visit.visitMods.reduce((sum, vm) => sum + vm.signups.length, 0);

            return (
              <Card key={visit.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{visit.title}</span>
                        <Badge variant="secondary">{COUNTY_LABELS[visit.county]}</Badge>
                        {visit.status !== "SCHEDULED" && (
                          <Badge variant={visit.status === "CANCELLED" ? "destructive" : "success"}>
                            {visit.status}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
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
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {filledSlots} / {totalSlots} volunteers
                        </span>
                      </div>

                      {/* Mod breakdown */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {visit.visitMods.map((vm) => (
                          <span
                            key={vm.id}
                            className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border font-medium ${
                              vm.signups.length >= vm.maxVolunteers
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                          >
                            {vm.mod.name}
                            <span className="text-gray-400">
                              {vm.signups.length}/{vm.maxVolunteers}
                            </span>
                          </span>
                        ))}
                      </div>

                      {visit.teamLeader && (
                        <p className="text-xs text-gray-400">
                          Team Leader: {visit.teamLeader.name}
                        </p>
                      )}
                    </div>

                    {visit.status === "SCHEDULED" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancel(visit.id, visit.title)}
                          disabled={cancelling === visit.id}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
