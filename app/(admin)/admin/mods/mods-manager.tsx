"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Mod } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Check, X, PowerOff, Trash2 } from "lucide-react";

interface Props {
  douglasMods: Mod[];
  sarpyMods: Mod[];
  isSuperAdmin: boolean;
  coordinatorCounty: string | null;
}

type County = "DOUGLAS" | "SARPY";

function ModList({
  county,
  mods: initialMods,
  canEdit,
}: {
  county: County;
  mods: Mod[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [mods, setMods] = useState<Mod[]>(initialMods);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setLoading("add");
    setError(null);
    const res = await fetch("/api/admin/mods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), county }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
    } else {
      setMods((prev) => [...prev, json]);
      setNewName("");
      setAdding(false);
      router.refresh();
    }
    setLoading(null);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/mods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
    } else {
      setMods((prev) => prev.map((m) => (m.id === id ? json : m)));
      setEditId(null);
    }
    setLoading(null);
  };

  const handleToggleActive = async (mod: Mod) => {
    setLoading(mod.id);
    const res = await fetch(`/api/admin/mods/${mod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !mod.isActive }),
    });
    if (res.ok) {
      const json = await res.json();
      setMods((prev) => prev.map((m) => (m.id === mod.id ? json : m)));
    }
    setLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this mod? If it has been used in visits it will be deactivated instead.")) return;
    setLoading(id);
    const res = await fetch(`/api/admin/mods/${id}`, { method: "DELETE" });
    if (res.ok) {
      const json = await res.json();
      if (json.message?.includes("deactivated")) {
        setMods((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: false } : m)));
      } else {
        setMods((prev) => prev.filter((m) => m.id !== id));
      }
    }
    setLoading(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          {county === "DOUGLAS" ? "Douglas County" : "Sarpy County"} Mods
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({mods.filter((m) => m.isActive).length} active)
          </span>
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Mod
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Add new mod row */}
        {adding && (
          <div className="flex gap-2 items-center">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Mod F"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
            />
            <Button size="sm" onClick={handleAdd} disabled={loading === "add"} className="h-8 w-8 p-0">
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }} className="h-8 w-8 p-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Mod list */}
        {mods.length === 0 && !adding && (
          <p className="text-sm text-gray-400 text-center py-4">No mods yet. Add one above.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {mods.map((mod) => (
            <div
              key={mod.id}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                mod.isActive ? "bg-white" : "bg-gray-50 opacity-60"
              }`}
            >
              {editId === mod.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(mod.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                  />
                  <button
                    onClick={() => handleRename(mod.id)}
                    disabled={loading === mod.id}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{mod.name}</span>
                  {!mod.isActive && (
                    <Badge variant="secondary" className="text-xs py-0">Inactive</Badge>
                  )}
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditId(mod.id); setEditName(mod.name); }}
                        className="text-gray-400 hover:text-blue-600 p-0.5"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(mod)}
                        disabled={loading === mod.id}
                        className={`p-0.5 ${mod.isActive ? "text-gray-400 hover:text-orange-500" : "text-gray-400 hover:text-green-600"}`}
                        title={mod.isActive ? "Deactivate" : "Activate"}
                      >
                        <PowerOff className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(mod.id)}
                        disabled={loading === mod.id}
                        className="text-gray-400 hover:text-red-600 p-0.5"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Always-visible action buttons for non-hover devices */}
        {canEdit && mods.length > 0 && (
          <p className="text-xs text-gray-400 pt-1">
            Click a mod name row to see rename / toggle / delete buttons.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ModsManager({ douglasMods, sarpyMods, isSuperAdmin, coordinatorCounty }: Props) {
  const showDouglas = isSuperAdmin || coordinatorCounty === "DOUGLAS" || coordinatorCounty === "BOTH";
  const showSarpy = isSuperAdmin || coordinatorCounty === "SARPY" || coordinatorCounty === "BOTH";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {showDouglas && (
        <ModList county="DOUGLAS" mods={douglasMods} canEdit={isSuperAdmin || coordinatorCounty === "DOUGLAS" || coordinatorCounty === "BOTH"} />
      )}
      {showSarpy && (
        <ModList county="SARPY" mods={sarpyMods} canEdit={isSuperAdmin || coordinatorCounty === "SARPY" || coordinatorCounty === "BOTH"} />
      )}
    </div>
  );
}
