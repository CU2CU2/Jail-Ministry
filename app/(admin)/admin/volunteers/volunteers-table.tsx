"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User, Church } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COUNTY_LABELS, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Church as ChurchIcon,
  UserPlus,
  Pencil,
  KeyRound,
  Trash2,
  UserX,
  UserCheck,
} from "lucide-react";

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

// ─── ActionModal (approve/reject) ────────────────────────────────────────────

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

// ─── AddUserModal ─────────────────────────────────────────────────────────────

interface AddUserModalProps {
  isSuperAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddUserModal({ isSuperAdmin, onClose, onSuccess }: AddUserModalProps) {
  const [churches, setChurches] = useState<Church[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VOLUNTEER",
    status: "APPROVED",
    county: "",
    phone: "",
    churchId: "",
    churchNameAlt: "",
    adminNotes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/churches")
      .then((r) => r.json())
      .then(setChurches)
      .catch(() => {});
  }, []);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);

    const payload: Record<string, string> = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      status: form.status,
    };
    if (form.county) payload.county = form.county;
    if (form.phone) payload.phone = form.phone;
    if (form.churchId) payload.churchId = form.churchId;
    else if (form.churchNameAlt) payload.churchNameAlt = form.churchNameAlt;
    if (form.adminNotes) payload.adminNotes = form.adminNotes;

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Something went wrong");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const roleOptions = isSuperAdmin
    ? [
        { value: "VOLUNTEER", label: "Volunteer" },
        { value: "TEAM_LEADER", label: "Team Leader" },
        { value: "COUNTY_COORDINATOR", label: "County Coordinator" },
        { value: "SUPER_ADMIN", label: "Super Admin" },
      ]
    : [
        { value: "VOLUNTEER", label: "Volunteer" },
        { value: "TEAM_LEADER", label: "Team Leader" },
      ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 my-8">
        <h2 className="text-lg font-semibold">Add User</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="au-name">Full Name *</Label>
            <Input
              id="au-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="au-email">Email *</Label>
            <Input
              id="au-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="au-password">Temporary Password *</Label>
            <Input
              id="au-password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="au-role">Role *</Label>
            <select
              id="au-role"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="au-status">Status *</Label>
            <select
              id="au-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="au-county">County</Label>
            <select
              id="au-county"
              value={form.county}
              onChange={(e) => set("county", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select county —</option>
              <option value="DOUGLAS">Douglas County</option>
              <option value="SARPY">Sarpy County</option>
              <option value="BOTH">Both Counties</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="au-phone">Phone</Label>
            <Input
              id="au-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(402) 555-0000"
            />
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="au-church">Church</Label>
            <select
              id="au-church"
              value={form.churchId}
              onChange={(e) => {
                set("churchId", e.target.value);
                if (e.target.value) set("churchNameAlt", "");
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select from list or type below —</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!form.churchId && (
              <Input
                value={form.churchNameAlt}
                onChange={(e) => set("churchNameAlt", e.target.value)}
                placeholder="Or type church name manually"
                className="mt-1"
              />
            )}
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="au-notes">Admin Notes</Label>
            <Textarea
              id="au-notes"
              value={form.adminNotes}
              onChange={(e) => set("adminNotes", e.target.value)}
              rows={2}
              placeholder="Internal notes (not visible to the user)"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Creating…" : "Create User"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── EditUserModal ────────────────────────────────────────────────────────────

interface EditUserModalProps {
  volunteer: VolunteerWithChurch;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ volunteer, isSuperAdmin, onClose, onSuccess }: EditUserModalProps) {
  const [churches, setChurches] = useState<Church[]>([]);
  const [form, setForm] = useState({
    name: volunteer.name,
    email: volunteer.email,
    role: volunteer.role as string,
    status: volunteer.status as string,
    county: volunteer.county ?? "",
    phone: volunteer.phone ?? "",
    churchId: volunteer.churchId ?? "",
    churchNameAlt: volunteer.churchNameAlt ?? "",
    adminNotes: volunteer.adminNotes ?? "",
    backgroundCheckDate: volunteer.backgroundCheckDate
      ? new Date(volunteer.backgroundCheckDate).toISOString().split("T")[0]
      : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/churches")
      .then((r) => r.json())
      .then(setChurches)
      .catch(() => {});
  }, []);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);

    const payload: Record<string, string | null> = {
      name: form.name,
      email: form.email,
      role: form.role,
      status: form.status,
      county: form.county || null,
      phone: form.phone || null,
      churchId: form.churchId || null,
      churchNameAlt: form.churchId ? null : form.churchNameAlt || null,
      adminNotes: form.adminNotes || null,
      backgroundCheckDate: form.backgroundCheckDate || null,
    };

    const res = await fetch(`/api/admin/users/${volunteer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Something went wrong");
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  const roleOptions = isSuperAdmin
    ? [
        { value: "VOLUNTEER", label: "Volunteer" },
        { value: "TEAM_LEADER", label: "Team Leader" },
        { value: "COUNTY_COORDINATOR", label: "County Coordinator" },
        { value: "SUPER_ADMIN", label: "Super Admin" },
      ]
    : [
        { value: "VOLUNTEER", label: "Volunteer" },
        { value: "TEAM_LEADER", label: "Team Leader" },
      ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 my-8">
        <h2 className="text-lg font-semibold">Edit User</h2>
        <p className="text-sm text-gray-500">{volunteer.name}</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="eu-name">Full Name</Label>
            <Input
              id="eu-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="eu-email">Email</Label>
            <Input
              id="eu-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="eu-role">Role</Label>
            <select
              id="eu-role"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="eu-status">Status</Label>
            <select
              id="eu-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="eu-county">County</Label>
            <select
              id="eu-county"
              value={form.county}
              onChange={(e) => set("county", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— None —</option>
              <option value="DOUGLAS">Douglas County</option>
              <option value="SARPY">Sarpy County</option>
              <option value="BOTH">Both Counties</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="eu-phone">Phone</Label>
            <Input
              id="eu-phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(402) 555-0000"
            />
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="eu-church">Church</Label>
            <select
              id="eu-church"
              value={form.churchId}
              onChange={(e) => {
                set("churchId", e.target.value);
                if (e.target.value) set("churchNameAlt", "");
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select from list or type below —</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!form.churchId && (
              <Input
                value={form.churchNameAlt}
                onChange={(e) => set("churchNameAlt", e.target.value)}
                placeholder="Or type church name manually"
                className="mt-1"
              />
            )}
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="eu-bgdate">Background Check Date</Label>
            <Input
              id="eu-bgdate"
              type="date"
              value={form.backgroundCheckDate}
              onChange={(e) => set("backgroundCheckDate", e.target.value)}
            />
            <p className="text-xs text-gray-400">Expiry auto-set to 2 years from this date.</p>
          </div>

          <div className="space-y-1 col-span-2">
            <Label htmlFor="eu-notes">Admin Notes</Label>
            <Textarea
              id="eu-notes"
              value={form.adminNotes}
              onChange={(e) => set("adminNotes", e.target.value)}
              rows={2}
              placeholder="Internal notes (not visible to the user)"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ResetPasswordModal ───────────────────────────────────────────────────────

interface ResetPasswordModalProps {
  volunteer: VolunteerWithChurch;
  onClose: () => void;
  onSuccess: () => void;
}

function ResetPasswordModal({ volunteer, onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${volunteer.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold">Reset Password</h2>
        <p className="text-sm text-gray-600">
          Set a temporary password for <strong>{volunteer.name}</strong>. They should change it on next login.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <Label htmlFor="rp-password">New Temporary Password</Label>
          <Input
            id="rp-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Saving…" : "Set Password"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  volunteer: VolunteerWithChurch;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteConfirmModal({ volunteer, onClose, onSuccess }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/admin/users/${volunteer.id}`, {
      method: "DELETE",
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-700">Delete User</h2>
        <p className="text-sm text-gray-600">
          Are you sure you want to permanently delete <strong>{volunteer.name}</strong>? This cannot be undone.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="destructive" onClick={submit} disabled={loading} className="flex-1">
            {loading ? "Deleting…" : "Delete"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── VolunteersTable ──────────────────────────────────────────────────────────

type ModalState =
  | { type: "approve" | "reject"; volunteer: VolunteerWithChurch }
  | { type: "edit"; volunteer: VolunteerWithChurch }
  | { type: "reset-password"; volunteer: VolunteerWithChurch }
  | { type: "delete"; volunteer: VolunteerWithChurch }
  | null;

export function VolunteersTable({ volunteers, currentStatus, isSuperAdmin }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

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

  const handleStatusToggle = async (v: VolunteerWithChurch, newStatus: "APPROVED" | "INACTIVE") => {
    setStatusLoading(v.id);
    const res = await fetch(`/api/admin/users/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusLoading(null);
    if (res.ok) {
      router.refresh();
    }
  };

  const handleModalSuccess = () => {
    setModal(null);
    router.refresh();
  };

  return (
    <>
      {modal?.type === "approve" || modal?.type === "reject" ? (
        <ActionModal
          volunteer={modal.volunteer}
          action={modal.type}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      ) : null}

      {modal?.type === "edit" && (
        <EditUserModal
          volunteer={modal.volunteer}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {modal?.type === "reset-password" && (
        <ResetPasswordModal
          volunteer={modal.volunteer}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {modal?.type === "delete" && (
        <DeleteConfirmModal
          volunteer={modal.volunteer}
          onClose={() => setModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showAddUser && (
        <AddUserModal
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowAddUser(false)}
          onSuccess={() => {
            setShowAddUser(false);
            router.refresh();
          }}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowAddUser(true)} className="gap-2 flex-shrink-0">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

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
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {/* PENDING tab: Approve + Reject + Edit */}
                    {currentStatus === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setModal({ type: "approve", volunteer: v })}
                          className="gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "reject", volunteer: v })}
                          className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "edit", volunteer: v })}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </>
                    )}

                    {/* APPROVED tab: Edit + Reset Password + Deactivate + Delete */}
                    {currentStatus === "APPROVED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "edit", volunteer: v })}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "reset-password", volunteer: v })}
                          className="gap-1"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusToggle(v, "INACTIVE")}
                          disabled={statusLoading === v.id}
                          className="gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          {statusLoading === v.id ? "…" : "Deactivate"}
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModal({ type: "delete", volunteer: v })}
                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </>
                    )}

                    {/* INACTIVE tab: Edit + Reset Password + Reactivate + Delete */}
                    {currentStatus === "INACTIVE" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "edit", volunteer: v })}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "reset-password", volunteer: v })}
                          className="gap-1"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusToggle(v, "APPROVED")}
                          disabled={statusLoading === v.id}
                          className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {statusLoading === v.id ? "…" : "Reactivate"}
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModal({ type: "delete", volunteer: v })}
                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </>
                    )}

                    {/* REJECTED tab: Edit + Delete */}
                    {currentStatus === "REJECTED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setModal({ type: "edit", volunteer: v })}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModal({ type: "delete", volunteer: v })}
                            className="gap-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </>
                    )}
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
