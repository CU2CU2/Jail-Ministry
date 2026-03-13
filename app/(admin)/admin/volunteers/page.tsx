import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VolunteersTable } from "./volunteers-table";
import type { UserCounty } from "@prisma/client";

export const metadata = { title: "Volunteers — Jail Ministry Admin" };

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: { status?: string; county?: string; q?: string };
}) {
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const coordinatorCounty = session!.user.county as UserCounty | null;

  const statusFilter = searchParams.status ?? "PENDING";
  const countyFilter = searchParams.county;
  const query = searchParams.q ?? "";

  const volunteers = await prisma.user.findMany({
    where: {
      role: { in: ["VOLUNTEER", "TEAM_LEADER"] },
      status: statusFilter as never,
      // County coordinators only see their own county volunteers
      ...(!isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
        ? {
            OR: [
              { county: coordinatorCounty },
              { county: "BOTH" },
            ],
          }
        : {}),
      ...(countyFilter ? { county: countyFilter as UserCounty } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : {}),
    },
    include: { church: true },
    orderBy: { createdAt: "asc" },
  });

  const pendingCount = await prisma.user.count({
    where: {
      role: { in: ["VOLUNTEER", "TEAM_LEADER"] },
      status: "PENDING",
      ...(!isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
        ? { OR: [{ county: coordinatorCounty }, { county: "BOTH" }] }
        : {}),
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-orange-600 font-medium mt-1">
              {pendingCount} pending application{pendingCount !== 1 ? "s" : ""} awaiting review
            </p>
          )}
        </div>
      </div>

      <VolunteersTable
        volunteers={volunteers}
        currentStatus={statusFilter}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
