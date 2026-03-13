import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["SUPER_ADMIN", "COUNTY_COORDINATOR"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const county = searchParams.get("county");

  const mods = await prisma.mod.findMany({
    where: county ? { county: county as "DOUGLAS" | "SARPY" } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(mods);
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  county: z.enum(["DOUGLAS", "SARPY"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, county } = createSchema.parse(body);

    // County coordinators can only manage their own county
    if (
      session.user.role === "COUNTY_COORDINATOR" &&
      session.user.county !== "BOTH" &&
      session.user.county !== county
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.mod.findUnique({
      where: { name_county: { name, county } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `${name} already exists for ${county} County.` },
        { status: 409 }
      );
    }

    const maxOrder = await prisma.mod.aggregate({
      where: { county },
      _max: { sortOrder: true },
    });

    const mod = await prisma.mod.create({
      data: {
        name,
        county,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(mod, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
