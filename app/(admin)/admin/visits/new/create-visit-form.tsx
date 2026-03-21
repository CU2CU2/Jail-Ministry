"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Mod, UserCounty } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  county: z.enum(["DOUGLAS", "SARPY"]),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
  teamLeaderId: z.string().optional(),
  maxVolunteersPerMod: z.number().int().min(1).max(10).default(2),
});

type FormData = z.infer<typeof schema>;

interface TeamLeader {
  id: string;
  name: string;
  county: UserCounty | null;
}

interface Props {
  douglasMods: Mod[];
  sarpyMods: Mod[];
  teamLeaders: TeamLeader[];
  isSuperAdmin: boolean;
  coordinatorCounty: UserCounty | null;
}

export function CreateVisitForm({ douglasMods, sarpyMods, teamLeaders, isSuperAdmin, coordinatorCounty }: Props) {
  const router = useRouter();
  const defaultCounty: "DOUGLAS" | "SARPY" | "" =
    !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
      ? (coordinatorCounty as "DOUGLAS" | "SARPY")
      : "";

  const [county, setCounty] = useState<"DOUGLAS" | "SARPY" | "">(defaultCounty);
  const [teamLeaderVal, setTeamLeaderVal] = useState("none");
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mods = county === "DOUGLAS" ? douglasMods : county === "SARPY" ? sarpyMods : [];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      county: defaultCounty as "DOUGLAS" | "SARPY" | undefined,
      maxVolunteersPerMod: 2,
    },
  });

  const toggleMod = (modId: string) => {
    setSelectedMods((prev) => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const selectAllMods = () => setSelectedMods(new Set(mods.map((m) => m.id)));
  const clearMods = () => setSelectedMods(new Set());

  const onSubmit = async (data: FormData) => {
    if (selectedMods.size === 0) {
      setError("Please select at least one mod for this visit.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        teamLeaderId: teamLeaderVal === "none" ? undefined : teamLeaderVal,
        modIds: Array.from(selectedMods),
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
    } else {
      router.push("/admin/visits");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label>Visit Title *</Label>
            <Input placeholder="e.g. Thursday Evening Visit" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>

          {/* County */}
          <div className="space-y-2">
            <Label>County *</Label>
            <Select
              value={county}
              onValueChange={(v) => {
                const c = v as "DOUGLAS" | "SARPY";
                setCounty(c);
                setValue("county", c);
                setSelectedMods(new Set());
              }}
              disabled={!isSuperAdmin && !!defaultCounty}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select county" />
              </SelectTrigger>
              <SelectContent>
                {(isSuperAdmin || coordinatorCounty === "DOUGLAS" || coordinatorCounty === "BOTH") && (
                  <SelectItem value="DOUGLAS">Douglas County</SelectItem>
                )}
                {(isSuperAdmin || coordinatorCounty === "SARPY" || coordinatorCounty === "BOTH") && (
                  <SelectItem value="SARPY">Sarpy County</SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.county && <p className="text-xs text-red-600">{errors.county.message}</p>}
          </div>

          {/* Date / Times */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3 sm:col-span-1">
              <Label>Date *</Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-red-600">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input type="time" {...register("startTime")} />
              {errors.startTime && <p className="text-xs text-red-600">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input type="time" {...register("endTime")} />
              {errors.endTime && <p className="text-xs text-red-600">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location *</Label>
            <Input placeholder="e.g. Douglas County Department of Corrections" {...register("location")} />
            {errors.location && <p className="text-xs text-red-600">{errors.location.message}</p>}
          </div>

          {/* Mods */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Mods Open for This Visit *
                {county && (
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    ({selectedMods.size} selected)
                  </span>
                )}
              </Label>
              {county && mods.length > 0 && (
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllMods} className="text-xs text-blue-600 hover:underline">
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button type="button" onClick={clearMods} className="text-xs text-gray-400 hover:underline">
                    Clear
                  </button>
                </div>
              )}
            </div>

            {!county ? (
              <p className="text-sm text-gray-400 border rounded-md p-3">
                Select a county first to see available mods.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border rounded-md p-3 bg-gray-50">
                {mods.map((mod) => (
                  <label
                    key={mod.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                      selectedMods.has(mod.id)
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "hover:bg-white text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMods.has(mod.id)}
                      onChange={() => toggleMod(mod.id)}
                      className="rounded border-gray-300"
                    />
                    {mod.name}
                  </label>
                ))}
                {mods.length === 0 && (
                  <p className="col-span-3 text-sm text-gray-400 text-center py-2">
                    No active mods for this county.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Max volunteers per mod */}
          <div className="space-y-2 max-w-xs">
            <Label>Max Volunteers Per Mod</Label>
            <Input
              type="number"
              min={1}
              max={10}
              defaultValue={2}
              {...register("maxVolunteersPerMod", { valueAsNumber: true })}
            />
            <p className="text-xs text-gray-400">Default is 2 (standard jail policy).</p>
          </div>

          {/* Team Leader */}
          <div className="space-y-2">
            <Label>Team Leader (optional)</Label>
            <Select value={teamLeaderVal} onValueChange={setTeamLeaderVal}>
              <SelectTrigger>
                <SelectValue placeholder="Assign a team leader…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {teamLeaders.map((tl) => (
                  <SelectItem key={tl.id} value={tl.id}>
                    {tl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea rows={3} placeholder="Any special instructions…" {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1 sm:flex-none sm:px-8">
              {loading ? "Creating…" : "Create Visit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
