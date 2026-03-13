import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ModsManager } from "./mods-manager";

export const metadata = { title: "Mods — Jail Ministry Admin" };

export default async function ModsPage() {
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  const [douglasMods, sarpyMods] = await Promise.all([
    prisma.mod.findMany({
      where: { county: "DOUGLAS" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.mod.findMany({
      where: { county: "SARPY" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  // Coordinators only see their county
  const coordinatorCounty = !isSuperAdmin ? session!.user.county : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Mods</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add, rename, and manage the jail modules for each county.
        </p>
      </div>

      <ModsManager
        douglasMods={douglasMods}
        sarpyMods={sarpyMods}
        isSuperAdmin={isSuperAdmin}
        coordinatorCounty={coordinatorCounty}
      />
    </div>
  );
}
