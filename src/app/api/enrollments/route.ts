import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId");

    const where = semesterId ? { semesterId } : {};

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: { student: true, semester: true, academicGroup: true },
      orderBy: { enrolledAt: "desc" },
    });
    return NextResponse.json(enrollments);
  } catch {
    return NextResponse.json({ error: "Failed to read enrollments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.studentId || !body.semesterId || !body.academicGroupId) {
      return NextResponse.json({ error: "studentId, semesterId, and academicGroupId are required" }, { status: 400 });
    }

    const student = await prisma.user.findUnique({ where: { id: body.studentId } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const semester = await prisma.semester.findUnique({ where: { id: body.semesterId } });
    if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });

    const group = await prisma.academicGroup.findUnique({ where: { id: body.academicGroupId } });
    if (!group) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });

    if (group.semesterId !== body.semesterId) {
      return NextResponse.json({ error: "Group does not belong to the selected semester" }, { status: 400 });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_semesterId: { studentId: body.studentId, semesterId: body.semesterId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Student already has an enrollment in this semester" }, { status: 409 });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: body.studentId,
        semesterId: body.semesterId,
        academicGroupId: body.academicGroupId,
        status: "ACTIVE",
      },
      include: { student: true, semester: true, academicGroup: true },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 });
  }
}
