import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VisitsAdmin } from "./visits-admin";
import type { UserCounty } from "@prisma/client";

export const metadata = { title: "Visits — Jail Ministry Admin" };

export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: { county?: string; status?: string };
}) {
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const coordinatorCounty = session!.user.county as UserCounty | null;

  const countyFilter = searchParams.county as UserCounty | undefined;
  const statusFilter = (searchParams.status ?? "SCHEDULED") as "SCHEDULED" | "COMPLETED" | "CANCELLED";

  const effectiveCounty = !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
    ? coordinatorCounty
    : countyFilter;

  const visits = await prisma.visit.findMany({
    where: {
      status: statusFilter,
      ...(effectiveCounty ? { county: effectiveCounty } : {}),
    },
    include: {
      visitMods: {
        include: {
          mod: true,
          signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
        },
        orderBy: { mod: { sortOrder: "asc" } },
      },
      teamLeader: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage scheduled visits for Douglas and Sarpy County jails.
          </p>
        </div>
      </div>

      <VisitsAdmin
        visits={visits}
        isSuperAdmin={isSuperAdmin}
        coordinatorCounty={coordinatorCounty}
        currentStatus={statusFilter}
      />
    </div>
  );
}
