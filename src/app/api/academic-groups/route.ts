import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const groups = await prisma.academicGroup.findMany({
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
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.semesterId || !body.cycleId || !body.nameInternal || !body.nameForStudents) {
      return NextResponse.json({ error: "semesterId, cycleId, nameInternal, and nameForStudents are required" }, { status: 400 });
    }

    const semester = await prisma.semester.findUnique({ where: { id: body.semesterId } });
    if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });

    const cycle = await prisma.cycle.findUnique({ where: { id: body.cycleId } });
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

    if (body.managerTeacherId) {
      const teacher = await prisma.user.findUnique({ where: { id: body.managerTeacherId } });
      if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const group = await prisma.academicGroup.create({
      data: {
        semesterId: body.semesterId,
        cycleId: body.cycleId,
        managerTeacherId: body.managerTeacherId || null,
        nameInternal: body.nameInternal,
        nameForStudents: body.nameForStudents,
      },
      include: { semester: true, cycle: true, managerTeacher: true },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Failed to create academic group:", err);
    return NextResponse.json({ error: "Failed to create academic group" }, { status: 500 });
  }
}
