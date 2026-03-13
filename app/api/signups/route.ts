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

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { visitModId } = schema.parse(body);

    const visitMod = await prisma.visitMod.findUnique({
      where: { id: visitModId },
      include: {
        visit: true,
        signups: { where: { status: { in: ["SIGNED_UP", "ATTENDED"] } } },
      },
    });

    if (!visitMod) {
      return NextResponse.json({ error: "Mod not found." }, { status: 404 });
    }
    if (visitMod.visit.status !== "SCHEDULED") {
      return NextResponse.json({ error: "This visit is no longer scheduled." }, { status: 400 });
    }
    if (new Date(visitMod.visit.date) < new Date()) {
      return NextResponse.json({ error: "Cannot sign up for past visits." }, { status: 400 });
    }

    // Check capacity
    const activeCount = visitMod.signups.length;
    if (activeCount >= visitMod.maxVolunteers) {
      return NextResponse.json(
        { error: `${visitMod.visit.title} — this mod is full (${visitMod.maxVolunteers} volunteers max).` },
        { status: 409 }
      );
    }

    // Check the user isn't already signed up for this visit (different mod)
    const existingSignup = await prisma.visitSignup.findUnique({
      where: { visitId_userId: { visitId: visitMod.visitId, userId } },
    });
    if (existingSignup) {
      if (existingSignup.status === "CANCELLED") {
        // Re-activate and move to this mod
        const updated = await prisma.visitSignup.update({
          where: { id: existingSignup.id },
          data: { visitModId, status: "SIGNED_UP", signedUpAt: new Date() },
          include: { visitMod: { include: { mod: true } }, visit: true },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json(
        { error: "You are already signed up for this visit." },
        { status: 409 }
      );
    }

    const signup = await prisma.visitSignup.create({
      data: {
        visitId: visitMod.visitId,
        visitModId,
        userId,
        status: "SIGNED_UP",
      },
      include: {
        visitMod: { include: { mod: true } },
        visit: true,
      },
    });

    return NextResponse.json(signup, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
