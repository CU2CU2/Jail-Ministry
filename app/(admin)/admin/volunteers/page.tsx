import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VolunteersTable } from "./volunteers-table";
import type { UserCounty } from "@prisma/client";

export const metadata = { title: "Volunteers — Jail Ministry Admin" };

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; county?: string; q?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";
  const coordinatorCounty = session!.user.county as UserCounty | null;

  const validStatuses = ["PENDING", "APPROVED", "REJECTED", "INACTIVE"];
  const statusFilter = validStatuses.includes(params.status ?? "") ? params.status! : "PENDING";

  // Coordinators cannot view counties outside their own via URL param
  const validCounties = ["DOUGLAS", "SARPY", "BOTH"];
  const requestedCounty = params.county;
  const countyFilter =
    requestedCounty && validCounties.includes(requestedCounty)
      ? !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH" && requestedCounty !== coordinatorCounty && requestedCounty !== "BOTH"
        ? null // block out-of-county filter for coordinators
        : requestedCounty
      : null;

  const query = params.q ?? "";

  // Super admins see all roles; coordinators only see VOLUNTEER and TEAM_LEADER
  const roleFilter = isSuperAdmin
    ? undefined
    : { in: ["VOLUNTEER", "TEAM_LEADER"] as ("VOLUNTEER" | "TEAM_LEADER")[] };

  // Coordinators are restricted to their county; super admins see all unless filtered
  const countyRestriction =
    !isSuperAdmin && coordinatorCounty && coordinatorCounty !== "BOTH"
      ? { OR: [{ county: coordinatorCounty }, { county: "BOTH" as UserCounty }] }
      : {};

  const volunteers = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      status: statusFilter as never,
      ...countyRestriction,
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
      ...(roleFilter ? { role: roleFilter } : {}),
      status: "PENDING",
      ...countyRestriction,
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
