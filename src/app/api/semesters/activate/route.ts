import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const { semesterId } = await request.json();
    if (!semesterId) {
      return NextResponse.json({ error: "semesterId is required" }, { status: 400 });
    }

    const semester = await prisma.semester.findFirst({
      where: { id: semesterId, ...campusWhere(auth.scope) },
    });
    if (!semester) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    await prisma.semester.updateMany({
      where: { active: true, ...campusWhere(auth.scope) },
      data: { active: false },
    });

    const updated = await prisma.semester.update({
      where: { id: semesterId },
      data: { active: true },
    });

    if (auth.scope!.isGlobalAdmin) {
      await prisma.institutionSettings.updateMany({
        data: { activeSemesterId: semesterId },
      });
    } else {
      const settings = await prisma.institutionSettings.findFirst();
      if (settings) {
        const currentActive = settings.activeSemesterId
          ? await prisma.semester.findUnique({ where: { id: settings.activeSemesterId } })
          : null;
        if (!currentActive || currentActive.campusId === auth.scope!.campusId) {
          await prisma.institutionSettings.update({
            where: { id: settings.id },
            data: { activeSemesterId: semesterId },
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to activate semester" }, { status: 500 });
  }
}
