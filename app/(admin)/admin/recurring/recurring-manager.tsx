"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecurringSchedule, RecurringScheduleMod, Mod, UserCounty } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, RefreshCw, PowerOff, CalendarDays, Clock, MapPin } from "lucide-react";
import { COUNTY_LABELS, formatTime } from "@/lib/utils";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ScheduleWithMods = RecurringSchedule & {
  mods: (RecurringScheduleMod & { mod: Mod })[];
  _count: { visits: number };
};

interface Props {
  schedules: ScheduleWithMods[];
  douglasMods: Mod[];
  sarpyMods: Mod[];
  isSuperAdmin: boolean;
  coordinatorCounty: UserCounty | null;
}

function GenerateModal({
  schedule,
  onClose,
  onSuccess,
}: {
  schedule: ScheduleWithMods;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [weeksAhead, setWeeksAhead] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/recurring/${schedule.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeksAhead }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
    } else {
      onSuccess(json.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Generate Visits</h2>
        <p className="text-sm text-gray-600">
          Generate upcoming visits from <strong>{schedule.title}</strong> (
          {DAY_NAMES[schedule.dayOfWeek]}s, {COUNTY_LABELS[schedule.county]}).
          Dates that already have a visit will be skipped.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

        <div className="space-y-2">
          <Label htmlFor="weeks">Weeks ahead to generate</Label>
          <Input
            id="weeks"
            type="number"
            min={1}
            max={26}
            value={weeksAhead}
            onChange={(e) => setWeeksAhead(Number(e.target.value))}
          />
          <p className="text-xs text-gray-400">Max 26 weeks (6 months).</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleGenerate} disabled={loading} className="flex-1">
            {loading ? "Generating…" : `Generate ${weeksAhead} weeks`}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateScheduleForm({
  douglasMods,
  sarpyMods,
  isSuperAdmin,
  coordinatorCounty,
  onCreated,
  onCancel,
}: {
  douglasMods: Mod[];
  sarpyMods: Mod[];
  isSuperAdmin: boolean;
  coordinatorCounty: UserCounty | null;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const defaultCounty: "DOUGLAS" | "SARPY" | "" =
    !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
      ? (coordinatorCounty as "DOUGLAS" | "SARPY")
      : "";

  const [county, setCounty] = useState<"DOUGLAS" | "SARPY" | "">(defaultCounty);
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [maxVol, setMaxVol] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mods = county === "DOUGLAS" ? douglasMods : county === "SARPY" ? sarpyMods : [];

  const toggleMod = (id: string) =>
    setSelectedMods((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!county || !title || !dayOfWeek || !startTime || !endTime || !location) {
      setError("Please fill in all required fields.");
      return;
    }
    if (selectedMods.size === 0) {
      setError("Select at least one mod.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        county,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        location,
        description,
        modIds: Array.from(selectedMods),
        maxVolunteersPerMod: maxVol,
      }),
    });

    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
    } else {
      onCreated();
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Recurring Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Thursday Evening Men's Pod" />
            </div>

            <div className="space-y-1">
              <Label>County *</Label>
              <Select value={county} onValueChange={(v) => { setCounty(v as "DOUGLAS" | "SARPY"); setSelectedMods(new Set()); }} disabled={!isSuperAdmin && !!defaultCounty}>
                <SelectTrigger><SelectValue placeholder="County" /></SelectTrigger>
                <SelectContent>
                  {(isSuperAdmin || coordinatorCounty === "DOUGLAS" || coordinatorCounty === "BOTH") && (
                    <SelectItem value="DOUGLAS">Douglas County</SelectItem>
                  )}
                  {(isSuperAdmin || coordinatorCounty === "SARPY" || coordinatorCounty === "BOTH") && (
                    <SelectItem value="SARPY">Sarpy County</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Day of Week *</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>End Time *</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Location *</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Douglas County Jail, Pod C" />
            </div>
          </div>

          {/* Mods */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mods * ({selectedMods.size} selected)</Label>
              {county && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedMods(new Set(mods.map(m => m.id)))} className="text-xs text-blue-600 hover:underline">All</button>
                  <button type="button" onClick={() => setSelectedMods(new Set())} className="text-xs text-gray-400 hover:underline">Clear</button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 border rounded-md p-3 bg-white">
              {county
                ? mods.map((mod) => (
                    <label key={mod.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm ${selectedMods.has(mod.id) ? "bg-blue-100 text-blue-900 font-medium" : "hover:bg-gray-50"}`}>
                      <input type="checkbox" checked={selectedMods.has(mod.id)} onChange={() => toggleMod(mod.id)} className="rounded" />
                      {mod.name}
                    </label>
                  ))
                : <p className="col-span-3 text-xs text-gray-400 text-center py-2">Select a county first.</p>
              }
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Max volunteers/mod</Label>
              <Input type="number" min={1} max={10} value={maxVol} onChange={(e) => setMaxVol(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea rows={1} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create Schedule"}</Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RecurringManager({ schedules: initial, douglasMods, sarpyMods, isSuperAdmin, coordinatorCounty }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState<ScheduleWithMods | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggleActive = async (schedule: ScheduleWithMods) => {
    const res = await fetch(`/api/admin/recurring/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !schedule.isActive }),
    });
    if (res.ok) router.refresh();
  };

  return (
    <>
      {generating && (
        <GenerateModal
          schedule={generating}
          onClose={() => setGenerating(null)}
          onSuccess={(msg) => {
            setGenerating(null);
            setSuccessMsg(msg);
            router.refresh();
            setTimeout(() => setSuccessMsg(null), 6000);
          }}
        />
      )}

      <div className="flex justify-between items-center">
        <div />
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {successMsg && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {showCreate && (
        <CreateScheduleForm
          douglasMods={douglasMods}
          sarpyMods={sarpyMods}
          isSuperAdmin={isSuperAdmin}
          coordinatorCounty={coordinatorCounty}
          onCreated={() => { setShowCreate(false); router.refresh(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {schedules.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No recurring schedules yet. Create one to generate visits automatically.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id} className={s.isActive ? "" : "opacity-60"}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{s.title}</span>
                      <Badge variant="secondary">{COUNTY_LABELS[s.county]}</Badge>
                      {!s.isActive && <Badge variant="outline">Inactive</Badge>}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Every {DAY_NAMES[s.dayOfWeek]}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {s.location}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {s.mods.map((rsm) => (
                        <span key={rsm.id} className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                          {rsm.mod.name}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-gray-400">{s._count.visits} visits generated total</p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {s.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setGenerating(s)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Generate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-gray-500"
                      onClick={() => handleToggleActive(s)}
                      title={s.isActive ? "Deactivate" : "Activate"}
                    >
                      <PowerOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
