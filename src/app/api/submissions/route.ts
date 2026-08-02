import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const studentId = searchParams.get("studentId");

    const where: Record<string, unknown> = {};
    if (auth.scope!.campusId) {
      where.assignment = { class: { academicGroup: { campusId: auth.scope!.campusId } } };
    }
    if (assignmentId) {
      where.assignmentId = assignmentId;
    }
    if (studentId) {
      where.studentId = studentId;
    } else if (auth.scope!.role === "student") {
      where.studentId = auth.scope!.userId;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: { versions: { orderBy: { versionNumber: "desc" } }, correctionRequests: true, grade: true, student: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(submissions);
  } catch {
    return NextResponse.json({ error: "Failed to read submissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher", "student"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.assignmentId || !body.studentId || !body.content) {
      return NextResponse.json({ error: "assignmentId, studentId, and content are required" }, { status: 400 });
    }

    if (auth.scope!.role === "student" && body.studentId !== auth.scope!.userId) {
      return NextResponse.json(
        { error: "Un estudiante solo puede entregar sus propias tareas" },
        { status: 403 }
      );
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: body.assignmentId,
        ...(auth.scope!.campusId
          ? { class: { academicGroup: { campusId: auth.scope!.campusId } } }
          : {}),
      },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const student = await prisma.user.findFirst({
      where: {
        id: body.studentId,
        ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
      },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: body.assignmentId, studentId: body.studentId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Submission already exists for this student and assignment" }, { status: 409 });
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: body.assignmentId,
        studentId: body.studentId,
        versions: {
          create: {
            versionNumber: 1,
            content: body.content,
            attachments: body.attachments?.length
              ? { create: body.attachments.map((a: { name: string; size: string; type: string; url: string }) => ({ name: a.name, size: a.size, type: a.type, url: a.url })) }
              : undefined,
          },
        },
      },
      include: { versions: { orderBy: { versionNumber: "desc" } }, correctionRequests: true, grade: true, student: true },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
}
