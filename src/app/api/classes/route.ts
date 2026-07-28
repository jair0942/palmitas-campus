import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const classes = await prisma.class.findMany({
      include: { teachingAssignment: true, academicGroup: true, subject: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(classes);
  } catch {
    return NextResponse.json({ error: "Failed to read classes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.name || !body.academicGroupId || !body.teachingAssignmentId) {
      return NextResponse.json({ error: "name, academicGroupId, and teachingAssignmentId are required" }, { status: 400 });
    }

    const group = await prisma.academicGroup.findUnique({ where: { id: body.academicGroupId } });
    if (!group) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });

    const ta = await prisma.teachingAssignment.findUnique({ where: { id: body.teachingAssignmentId } });
    if (!ta) return NextResponse.json({ error: "Teaching assignment not found" }, { status: 404 });

    if (body.subjectId) {
      const subject = await prisma.subject.findUnique({ where: { id: body.subjectId } });
      if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const cycle = await prisma.cycle.findUnique({ where: { id: group.cycleId } });
    if (cycle && !cycle.usesSubjects && body.subjectId) {
      return NextResponse.json({ error: "Subjects are not allowed for Cycle 2" }, { status: 400 });
    }

    const cls = await prisma.class.create({
      data: {
        teachingAssignmentId: body.teachingAssignmentId,
        academicGroupId: body.academicGroupId,
        subjectId: cycle && !cycle.usesSubjects ? null : (body.subjectId || null),
        name: body.name,
        section: body.section || "",
        description: body.description || "",
      },
      include: { teachingAssignment: true, academicGroup: true, subject: true },
    });

    return NextResponse.json(cls, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 });
  }
}
