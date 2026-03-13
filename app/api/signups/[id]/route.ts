import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const signup = await prisma.visitSignup.findUnique({
    where: { id: params.id },
    include: { visit: true },
  });

  if (!signup) return NextResponse.json({ error: "Signup not found." }, { status: 404 });
  if (signup.userId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (new Date(signup.visit.date) < new Date()) {
    return NextResponse.json({ error: "Cannot cancel a past visit." }, { status: 400 });
  }
  if (signup.status !== "SIGNED_UP") {
    return NextResponse.json({ error: "This signup cannot be cancelled." }, { status: 400 });
  }

  await prisma.visitSignup.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ message: "Signup cancelled." });
}
