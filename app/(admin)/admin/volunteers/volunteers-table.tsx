"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User, Church } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTY_LABELS, formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, Phone, Mail, MapPin, Church as ChurchIcon } from "lucide-react";

type VolunteerWithChurch = User & { church: Church | null };

const STATUS_TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INACTIVE", label: "Inactive" },
];

interface Props {
  volunteers: VolunteerWithChurch[];
  currentStatus: string;
  isSuperAdmin: boolean;
}

interface ActionModalProps {
  volunteer: VolunteerWithChurch;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: () => void;
}

function ActionModal({ volunteer, action, onClose, onSuccess }: ActionModalProps) {
  const [bgDate, setBgDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/volunteers/${volunteer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        backgroundCheckDate: bgDate || undefined,
        adminNotes: notes || undefined,
        rejectionReason: reason || undefined,
      }),
    });

    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Something went wrong");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {action === "approve" ? "Approve Volunteer" : "Reject Application"}
        </h2>
        <p className="text-sm text-gray-600">
          {action === "approve"
            ? `Approving ${volunteer.name} will grant them access to sign up for visits.`
            : `Rejecting ${volunteer.name}'s application will notify them by email.`}
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {action === "approve" && (
          <div className="space-y-2">
            <Label htmlFor="bgDate">Background Check Date (optional)</Label>
            <Input
              id="bgDate"
              type="date"
              value={bgDate}
              onChange={(e) => setBgDate(e.target.value)}
            />
            <p className="text-xs text-gray-400">
              If entered, expiry will be set to 2 years from this date.
            </p>
          </div>
        )}

        {action === "reject" && (
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (shown to volunteer, optional)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Background check did not clear"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Internal Notes (not shown to volunteer)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes visible only to admins"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={submit}
            disabled={loading}
            variant={action === "approve" ? "default" : "destructive"}
            className="flex-1"
          >
            {loading ? "Saving…" : action === "approve" ? "Approve" : "Reject"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function VolunteersTable({ volunteers, currentStatus, isSuperAdmin }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{
    volunteer: VolunteerWithChurch;
    action: "approve" | "reject";
  } | null>(null);

  const filtered = volunteers.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.phone ?? "").includes(q)
    );
  });

  const handleTabChange = (status: string) => {
    const params = new URLSearchParams({ status });
    router.push(`/admin/volunteers?${params.toString()}`);
  };

  return (
    <>
      {modal && (
        <ActionModal
          volunteer={modal.volunteer}
          action={modal.action}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}

      {/* Status tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
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

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            No volunteers found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <Card key={v.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{v.name}</span>
                      {v.county && (
                        <Badge variant="secondary" className="text-xs">
                          {COUNTY_LABELS[v.county]}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {v.email}
                      </span>
                      {v.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {v.phone}
                        </span>
                      )}
                      {(v.church || v.churchNameAlt) && (
                        <span className="flex items-center gap-1">
                          <ChurchIcon className="h-3 w-3" />
                          {v.church ? v.church.name : v.churchNameAlt}
                        </span>
                      )}
                      {v.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {v.address}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Applied {formatDate(v.createdAt)}</span>
                      {v.backgroundCheckDate && (
                        <span>
                          BG check: {formatDate(v.backgroundCheckDate)}
                          {v.backgroundCheckExpiry && (
                            <> · expires {formatDate(v.backgroundCheckExpiry)}</>
                          )}
                        </span>
                      )}
                    </div>

                    {v.adminNotes && (
                      <p className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-yellow-800">
                        Note: {v.adminNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {currentStatus === "PENDING" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setModal({ volunteer: v, action: "approve" })}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModal({ volunteer: v, action: "reject" })}
                        className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {currentStatus === "APPROVED" && (
                    <Badge variant="success">Approved</Badge>
                  )}
                  {currentStatus === "REJECTED" && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
