import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere, writeCampusError } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const groups = await prisma.academicGroup.findMany({
      where: campusWhere(auth.scope),
      include: { semester: true, cycle: true, managerTeacher: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: "Failed to read academic groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;
    const body = await request.json();
    if (!body.semesterId || !body.cycleId || !body.nameInternal || !body.nameForStudents) {
      return NextResponse.json({ error: "semesterId, cycleId, nameInternal, and nameForStudents are required" }, { status: 400 });
    }

    const campusId = auth.scope!.campusId;

    const semester = await prisma.semester.findFirst({
      where: { id: body.semesterId, campusId },
    });
    if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });

    const cycle = await prisma.cycle.findFirst({
      where: { id: body.cycleId, campusId },
    });
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

    if (body.managerTeacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: body.managerTeacherId, campusId },
      });
      if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const group = await prisma.academicGroup.create({
      data: {
        semesterId: body.semesterId,
        cycleId: body.cycleId,
        managerTeacherId: body.managerTeacherId || null,
        nameInternal: body.nameInternal,
        nameForStudents: body.nameForStudents,
        campusId,
      },
      include: { semester: true, cycle: true, managerTeacher: true },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Failed to create academic group:", err);
    return NextResponse.json({ error: "Failed to create academic group" }, { status: 500 });
  }
}
