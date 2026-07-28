import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;

    const { semesterId } = await request.json();
    if (!semesterId) {
      return NextResponse.json({ error: "semesterId is required" }, { status: 400 });
    }

    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!semester) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    await prisma.semester.updateMany({
      where: { active: true },
      data: { active: false },
    });

    const updated = await prisma.semester.update({
      where: { id: semesterId },
      data: { active: true },
    });

    await prisma.institutionSettings.updateMany({
      data: { activeSemesterId: semesterId },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to activate semester" }, { status: 500 });
  }
}
