"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Clock, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { formatDate, formatTime, COUNTY_LABELS } from "@/lib/utils";
import type { UserCounty } from "@prisma/client";

interface ModSlot {
  visitModId: string;
  modId: string;
  modName: string;
  maxVolunteers: number;
  signupCount: number;
  isFull: boolean;
  mySignup: { id: string; status: string } | null;
}

interface VisitEntry {
  id: string;
  title: string;
  county: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string | null;
  mods: ModSlot[];
  myVisitSignup: { id: string; status: string } | null;
}

interface Props {
  userCounty: UserCounty | null;
}

function groupByDate(visits: VisitEntry[]): Map<string, VisitEntry[]> {
  const map = new Map<string, VisitEntry[]>();
  for (const v of visits) {
    const key = new Date(v.date).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  return map;
}

export function ScheduleList({ userCounty }: Props) {
  const [visits, setVisits] = useState<VisitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countyFilter, setCountyFilter] = useState<string>(
    userCounty && userCounty !== "BOTH" ? userCounty : ""
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (countyFilter && countyFilter !== "ALL") params.set("county", countyFilter);
    const res = await fetch(`/api/schedule?${params}`);
    if (res.ok) setVisits(await res.json());
    setLoading(false);
  }, [countyFilter]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const handleSignUp = async (visitModId: string) => {
    setActionLoading(visitModId);
    const res = await fetch("/api/signups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitModId }),
    });
    const json = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      showToast("error", json.error ?? "Could not sign up.");
    } else {
      showToast("success", `Signed up for ${json.visitMod?.mod?.name ?? "mod"} successfully!`);
      fetchSchedule();
    }
  };

  const handleCancel = async (signupId: string) => {
    if (!confirm("Cancel your signup for this visit?")) return;
    setActionLoading(signupId);
    const res = await fetch(`/api/signups/${signupId}`, { method: "DELETE" });
    const json = await res.json();
    setActionLoading(null);
    if (!res.ok) {
      showToast("error", json.error ?? "Could not cancel.");
    } else {
      showToast("success", "Signup cancelled.");
      fetchSchedule();
    }
  };

  const grouped = groupByDate(visits);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* County filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by county:</label>
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All counties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All counties</SelectItem>
            <SelectItem value="DOUGLAS">Douglas County</SelectItem>
            <SelectItem value="SARPY">Sarpy County</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading schedule…
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No upcoming visits scheduled. Check back soon.
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([dateStr, dayVisits]) => (
          <div key={dateStr} className="space-y-3">
            {/* Date header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                {formatDate(new Date(dateStr))}
              </div>
              <div className="flex-1 border-t" />
            </div>

            {dayVisits.map((visit) => {
              const mySignup = visit.mods.find((m) => m.mySignup !== null);
              const isSignedUp = !!mySignup?.mySignup;

              return (
                <Card key={visit.id} className={isSignedUp ? "border-green-300 bg-green-50/30" : ""}>
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {visit.title}
                          {isSignedUp && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              Signed up
                            </span>
                          )}
                        </CardTitle>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
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
                      <Badge variant="secondary" className="self-start">
                        {COUNTY_LABELS[visit.county]}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {visit.notes && (
                      <p className="text-xs text-gray-500 mb-3 italic">{visit.notes}</p>
                    )}

                    {/* Mod grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {visit.mods.map((mod) => {
                        const isMyMod = mod.mySignup !== null;
                        const isBusy = actionLoading === mod.visitModId || actionLoading === mod.mySignup?.id;

                        return (
                          <div
                            key={mod.visitModId}
                            className={`rounded-md border p-2.5 text-center text-sm transition-colors ${
                              isMyMod
                                ? "border-green-400 bg-green-50"
                                : mod.isFull
                                ? "border-gray-200 bg-gray-50 opacity-60"
                                : "border-gray-200 bg-white hover:border-blue-300"
                            }`}
                          >
                            <p className="font-semibold text-gray-800 mb-1">{mod.modName}</p>
                            <p className="text-xs text-gray-400 mb-2">
                              {mod.signupCount} / {mod.maxVolunteers} volunteers
                            </p>

                            {isMyMod ? (
                              <button
                                onClick={() => handleCancel(mod.mySignup!.id)}
                                disabled={isBusy || isSignedUp && !isMyMod}
                                className="text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                {isBusy ? "…" : "Cancel"}
                              </button>
                            ) : mod.isFull ? (
                              <span className="text-xs text-gray-400 font-medium">Full</span>
                            ) : isSignedUp ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <Button
                                size="sm"
                                className="h-6 text-xs px-3"
                                onClick={() => handleSignUp(mod.visitModId)}
                                disabled={isBusy}
                              >
                                {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sign Up"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
