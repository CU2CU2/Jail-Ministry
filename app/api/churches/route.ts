import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const churches = await prisma.church.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(churches);
}
