import { PrismaClient, Role, VolunteerStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Churches ──────────────────────────────────────────────────────────────
  const churches = await Promise.all([
    prisma.church.upsert({
      where: { id: "church-1" },
      update: {},
      create: {
        id: "church-1",
        name: "Hillside Christian Church",
        city: "Omaha",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-2" },
      update: {},
      create: {
        id: "church-2",
        name: "First Baptist Church of Omaha",
        city: "Omaha",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-3" },
      update: {},
      create: {
        id: "church-3",
        name: "Westside Church",
        city: "Omaha",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-4" },
      update: {},
      create: {
        id: "church-4",
        name: "Papillion La Vista Community Church",
        city: "Papillion",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-5" },
      update: {},
      create: {
        id: "church-5",
        name: "Bellevue Christian Church",
        city: "Bellevue",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-6" },
      update: {},
      create: {
        id: "church-6",
        name: "Grace Church Omaha",
        city: "Omaha",
        state: "NE",
      },
    }),
    prisma.church.upsert({
      where: { id: "church-7" },
      update: {},
      create: {
        id: "church-7",
        name: "Christ Community Church",
        city: "Omaha",
        state: "NE",
      },
    }),
  ]);

  console.log(`Seeded ${churches.length} churches`);

  // ── Douglas County Mods ───────────────────────────────────────────────────
  const douglasModNames = [
    "Mod 1", "Mod 2", "Mod 3", "Mod 4", "Mod 5",
    "Mod 6", "Mod 7", "Mod 8", "Mod 9", "Mod 10",
    "Mod A", "Mod B", "Mod C", "Mod D", "Mod E",
  ];
  for (let i = 0; i < douglasModNames.length; i++) {
    await prisma.mod.upsert({
      where: { name_county: { name: douglasModNames[i], county: "DOUGLAS" } },
      update: {},
      create: { name: douglasModNames[i], county: "DOUGLAS", sortOrder: i },
    });
  }
  console.log(`Seeded ${douglasModNames.length} Douglas County mods`);

  // ── Sarpy County Mods ─────────────────────────────────────────────────────
  const sarpyModNames = [
    "Mod 1", "Mod 2", "Mod 3", "Mod 4",
    "Mod A", "Mod B", "Mod C",
    "Mod F", "Mod G", "Mod H",
  ];
  for (let i = 0; i < sarpyModNames.length; i++) {
    await prisma.mod.upsert({
      where: { name_county: { name: sarpyModNames[i], county: "SARPY" } },
      update: {},
      create: { name: sarpyModNames[i], county: "SARPY", sortOrder: i },
    });
  }
  console.log(`Seeded ${sarpyModNames.length} Sarpy County mods`);

  // ── Super Admin ───────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin1234!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@jailministry.org" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@jailministry.org",
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      status: VolunteerStatus.APPROVED,
      churchId: churches[0].id,
    },
  });

  console.log(`Seeded admin: ${admin.email}`);

  // ── Douglas County Coordinator ────────────────────────────────────────────
  const dcPassword = await bcrypt.hash("Coord1234!", 12);
  const douglasCoord = await prisma.user.upsert({
    where: { email: "douglas@jailministry.org" },
    update: {},
    create: {
      name: "Douglas Coordinator",
      email: "douglas@jailministry.org",
      password: dcPassword,
      role: Role.COUNTY_COORDINATOR,
      status: VolunteerStatus.APPROVED,
      county: "DOUGLAS",
      churchId: churches[1].id,
    },
  });

  // ── Sarpy County Coordinator ──────────────────────────────────────────────
  const scPassword = await bcrypt.hash("Coord1234!", 12);
  const sarpyCoord = await prisma.user.upsert({
    where: { email: "sarpy@jailministry.org" },
    update: {},
    create: {
      name: "Sarpy Coordinator",
      email: "sarpy@jailministry.org",
      password: scPassword,
      role: Role.COUNTY_COORDINATOR,
      status: VolunteerStatus.APPROVED,
      county: "SARPY",
      churchId: churches[3].id,
    },
  });

  console.log(`Seeded coordinators: ${douglasCoord.email}, ${sarpyCoord.email}`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
