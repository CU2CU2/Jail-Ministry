import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  visitModId: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Your account is not yet approved." }, { status: 403 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { visitModId } = schema.parse(body);

    // Run the entire signup inside a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const visitMod = await tx.visitMod.findUnique({
        where: { id: visitModId },
        include: {
          visit: true,
          signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
        },
      });

      if (!visitMod) throw { status: 404, message: "Mod not found." };
      if (visitMod.visit.status !== "SCHEDULED")
        throw { status: 400, message: "This visit is no longer scheduled." };
      if (new Date(visitMod.visit.date) < new Date())
        throw { status: 400, message: "Cannot sign up for past visits." };

      // Re-check capacity inside transaction (prevents race condition)
      const activeCount = visitMod.signups.length;
      if (activeCount >= visitMod.maxVolunteers) {
        throw {
          status: 409,
          message: `This mod is full (${visitMod.maxVolunteers} volunteers max).`,
        };
      }

      const existingSignup = await tx.visitSignup.findUnique({
        where: { visitId_userId: { visitId: visitMod.visitId, userId } },
      });

      if (existingSignup) {
        if (existingSignup.status === "CANCELLED") {
          // Re-activate — capacity already checked above inside this transaction
          return tx.visitSignup.update({
            where: { id: existingSignup.id },
            data: { visitModId, status: "SIGNED_UP", signedUpAt: new Date() },
            include: { visitMod: { include: { mod: true } }, visit: true },
          });
        }
        throw { status: 409, message: "You are already signed up for this visit." };
      }

      return tx.visitSignup.create({
        data: { visitId: visitMod.visitId, visitModId, userId, status: "SIGNED_UP" },
        include: { visitMod: { include: { mod: true } }, visit: true },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      const e = err as { status: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
