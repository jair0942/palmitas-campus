import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId");
    const studentId = searchParams.get("studentId");

    const where: Record<string, string> = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (studentId) where.studentId = studentId;

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
    const body = await request.json();
    if (!body.assignmentId || !body.studentId || !body.content) {
      return NextResponse.json({ error: "assignmentId, studentId, and content are required" }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    const student = await prisma.user.findUnique({ where: { id: body.studentId } });
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
