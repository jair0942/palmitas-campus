import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCampusScope } from "@/lib/campus-scope";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;

    const campuses = await prisma.campus.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, active: true },
    });

    return NextResponse.json(campuses);
  } catch {
    return NextResponse.json({ error: "Failed to read campuses" }, { status: 500 });
  }
}
