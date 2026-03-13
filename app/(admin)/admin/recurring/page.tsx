import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RecurringManager } from "./recurring-manager";
import type { UserCounty } from "@prisma/client";

export const metadata = { title: "Recurring Schedules — Jail Ministry Admin" };

export default async function RecurringPage() {
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const coordinatorCounty = session!.user.county as UserCounty | null;

  const effectiveCounty =
    !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
      ? coordinatorCounty
      : undefined;

  const [schedules, douglasMods, sarpyMods] = await Promise.all([
    prisma.recurringSchedule.findMany({
      where: effectiveCounty ? { county: effectiveCounty } : undefined,
      include: {
        mods: { include: { mod: true }, orderBy: { mod: { sortOrder: "asc" } } },
        _count: { select: { visits: true } },
      },
      orderBy: [{ county: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.mod.findMany({
      where: { county: "DOUGLAS", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.mod.findMany({
      where: { county: "SARPY", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recurring Schedules</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define weekly visit patterns and generate visits in bulk.
        </p>
      </div>

      <RecurringManager
        schedules={schedules}
        douglasMods={douglasMods}
        sarpyMods={sarpyMods}
        isSuperAdmin={isSuperAdmin}
        coordinatorCounty={coordinatorCounty}
      />
    </div>
  );
}
