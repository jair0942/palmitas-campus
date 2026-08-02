import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere, writeCampusError } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const tas = await prisma.teachingAssignment.findMany({
      where: campusWhere(auth.scope),
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
        cycle: { select: { id: true, code: true, name: true, usesSubjects: true } },
        subject: { select: { id: true, code: true, name: true } },
        academicGroup: { select: { id: true, nameInternal: true, nameForStudents: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tas);
  } catch {
    return NextResponse.json({ error: "Failed to read teaching assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;
    const body = await request.json();
    if (!body.teacherId || !body.cycleId) {
      return NextResponse.json({ error: "teacherId and cycleId are required" }, { status: 400 });
    }

    const campusId = auth.scope!.campusId;

    const teacher = await prisma.user.findFirst({
      where: { id: body.teacherId, campusId },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const cycle = await prisma.cycle.findFirst({
      where: { id: body.cycleId, campusId },
    });
    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.usesSubjects) {
      if (!body.subjectId) {
        return NextResponse.json({ error: "Subject is required for this cycle" }, { status: 400 });
      }
      const subject = await prisma.subject.findFirst({
        where: { id: body.subjectId, campusId },
      });
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
    } else {
      if (body.subjectId) {
        return NextResponse.json({ error: "Cycle 2 should not have a subject" }, { status: 400 });
      }
    }

    if (body.academicGroupId) {
      const group = await prisma.academicGroup.findFirst({
        where: { id: body.academicGroupId, campusId },
      });
      if (!group) {
        return NextResponse.json({ error: "Academic group not found" }, { status: 404 });
      }
    }

    const existingTA = await prisma.teachingAssignment.findFirst({
      where: {
        teacherId: body.teacherId,
        cycleId: body.cycleId,
        subjectId: body.subjectId ?? null,
        academicGroupId: body.academicGroupId ?? null,
        campusId,
      },
    });
    if (existingTA) {
      return NextResponse.json({ error: "Duplicate teaching assignment" }, { status: 409 });
    }

    const ta = await prisma.teachingAssignment.create({
      data: {
        teacherId: body.teacherId,
        cycleId: body.cycleId,
        subjectId: body.subjectId ?? null,
        academicGroupId: body.academicGroupId ?? null,
        active: body.active ?? true,
        campusId,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
        cycle: { select: { id: true, code: true, name: true, usesSubjects: true } },
        subject: { select: { id: true, code: true, name: true } },
        academicGroup: { select: { id: true, nameInternal: true, nameForStudents: true } },
      },
    });

    return NextResponse.json(ta, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create teaching assignment" }, { status: 500 });
  }
}
