import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const mod = await prisma.mod.findUnique({ where: { id } });
    if (!mod) return NextResponse.json({ error: "Mod not found" }, { status: 404 });

    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== mod.county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    // If renaming, check for duplicate
    if (data.name && data.name !== mod.name) {
      const dup = await prisma.mod.findUnique({
        where: { name_county: { name: data.name, county: mod.county } },
      });
      if (dup) {
        return NextResponse.json(
          { error: `${data.name} already exists for ${mod.county} County.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.mod.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mod = await prisma.mod.findUnique({ where: { id } });
  if (!mod) return NextResponse.json({ error: "Mod not found" }, { status: 404 });

  // Check for existing visit signups referencing this mod
  const usedCount = await prisma.visitMod.count({ where: { modId: id } });
  if (usedCount > 0) {
    // Soft delete instead
    await prisma.mod.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ message: "Mod deactivated (has existing visits)." });
  }

  await prisma.mod.delete({ where: { id } });
  return NextResponse.json({ message: "Mod deleted." });
}
