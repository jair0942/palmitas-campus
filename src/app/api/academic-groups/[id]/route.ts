import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.academicGroup.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });

    const campusId = existing.campusId;

    if (body.semesterId && body.semesterId !== existing.semesterId) {
      const semester = await prisma.semester.findFirst({ where: { id: body.semesterId, campusId } });
      if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }
    if (body.cycleId && body.cycleId !== existing.cycleId) {
      const cycle = await prisma.cycle.findFirst({ where: { id: body.cycleId, campusId } });
      if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    if (body.managerTeacherId) {
      const teacher = await prisma.user.findFirst({ where: { id: body.managerTeacherId, campusId } });
      if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.semesterId !== undefined) data.semesterId = body.semesterId;
    if (body.cycleId !== undefined) data.cycleId = body.cycleId;
    if (body.managerTeacherId !== undefined) data.managerTeacherId = body.managerTeacherId || null;
    if (body.nameInternal !== undefined) data.nameInternal = body.nameInternal;
    if (body.nameForStudents !== undefined) data.nameForStudents = body.nameForStudents;
    if (body.active !== undefined) data.active = body.active;

    const group = await prisma.academicGroup.update({
      where: { id },
      data,
      include: { semester: true, cycle: true, managerTeacher: true },
    });

    return NextResponse.json(group);
  } catch {
    return NextResponse.json({ error: "Failed to update academic group" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.academicGroup.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });

    await prisma.academicGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete academic group" }, { status: 500 });
  }
}
