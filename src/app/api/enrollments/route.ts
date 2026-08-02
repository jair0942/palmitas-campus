import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, writeCampusError } from "@/lib/campus-scope";
import { enrollmentReadWhere } from "@/lib/enrollment-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId");

    const where: Record<string, unknown> = enrollmentReadWhere(auth.scope!);
    if (semesterId) where.semesterId = semesterId;

    const enrollments = await prisma.enrollment.findMany({
      where: where as never,
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
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;
    const body = await request.json();
    if (!body.studentId || !body.semesterId || !body.academicGroupId) {
      return NextResponse.json({ error: "studentId, semesterId, and academicGroupId are required" }, { status: 400 });
    }

    const campusId = auth.scope!.campusId;

    const student = await prisma.user.findFirst({
      where: { id: body.studentId, campusId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const semester = await prisma.semester.findFirst({
      where: { id: body.semesterId, campusId },
    });
    if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });

    const group = await prisma.academicGroup.findFirst({
      where: { id: body.academicGroupId, campusId },
    });
    if (!group) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });

    if (group.semesterId !== body.semesterId) {
      return NextResponse.json({ error: "Group does not belong to the selected semester" }, { status: 400 });
    }

    if (auth.scope!.role === "teacher") {
      const teachesGroup =
        group.managerTeacherId === auth.scope!.userId ||
        (await prisma.class.count({
          where: { academicGroupId: group.id, teachingAssignment: { teacherId: auth.scope!.userId } },
        })) > 0 ||
        (await prisma.teachingAssignment.count({
          where: { academicGroupId: group.id, teacherId: auth.scope!.userId },
        })) > 0;
      if (!teachesGroup) {
        return NextResponse.json({ error: "No tienes acceso a este grupo" }, { status: 403 });
      }
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
