import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateVisitForm } from "./create-visit-form";
import type { UserCounty } from "@prisma/client";

export const metadata = { title: "Create Visit — Jail Ministry Admin" };

export default async function NewVisitPage() {
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const coordinatorCounty = session!.user.county as UserCounty | null;

  const [douglasMods, sarpyMods, teamLeaders] = await Promise.all([
    prisma.mod.findMany({
      where: { county: "DOUGLAS", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.mod.findMany({
      where: { county: "SARPY", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        status: "APPROVED",
        role: { in: ["TEAM_LEADER", "COUNTY_COORDINATOR", "SUPER_ADMIN"] },
      },
      select: { id: true, name: true, county: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Visit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Schedule a one-off visit and select which mods will be open.
        </p>
      </div>

      <CreateVisitForm
        douglasMods={douglasMods}
        sarpyMods={sarpyMods}
        teamLeaders={teamLeaders}
        isSuperAdmin={isSuperAdmin}
        coordinatorCounty={coordinatorCounty}
      />
    </div>
  );
}
