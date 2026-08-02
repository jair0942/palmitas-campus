import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.teachingAssignment.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Teaching assignment not found" }, { status: 404 });
    }

    const campusId = existing.campusId;

    if (body.teacherId) {
      const teacher = await prisma.user.findFirst({ where: { id: body.teacherId, campusId } });
      if (!teacher) {
        return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
      }
    }

    if (body.subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: body.subjectId, campusId } });
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
    }

    if (body.cycleId) {
      const cycle = await prisma.cycle.findFirst({ where: { id: body.cycleId, campusId } });
      if (!cycle) {
        return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
      }
    }

    if (body.academicGroupId) {
      const group = await prisma.academicGroup.findFirst({ where: { id: body.academicGroupId, campusId } });
      if (!group) {
        return NextResponse.json({ error: "Academic group not found" }, { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.teacherId !== undefined) data.teacherId = body.teacherId;
    if (body.cycleId !== undefined) data.cycleId = body.cycleId;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId || null;
    if (body.academicGroupId !== undefined) data.academicGroupId = body.academicGroupId || null;
    if (body.active !== undefined) data.active = body.active;

    const ta = await prisma.teachingAssignment.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
        cycle: { select: { id: true, code: true, name: true, usesSubjects: true } },
        subject: { select: { id: true, code: true, name: true } },
        academicGroup: { select: { id: true, nameInternal: true, nameForStudents: true } },
      },
    });

    return NextResponse.json(ta);
  } catch {
    return NextResponse.json({ error: "Failed to update teaching assignment" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.teachingAssignment.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Teaching assignment not found" }, { status: 404 });
    }

    const hasClasses = await prisma.class.count({ where: { teachingAssignmentId: id } });
    if (hasClasses > 0) {
      return NextResponse.json({ error: "Cannot delete teaching assignment with classes" }, { status: 409 });
    }

    await prisma.teachingAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete teaching assignment" }, { status: 500 });
  }
}
