import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

function submissionScopeFilter(campusId: string | null) {
  if (!campusId) return {};
  return { assignment: { class: { academicGroup: { campusId } } } };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const submission = await prisma.submission.findFirst({
      where: { id, ...submissionScopeFilter(auth.scope!.campusId) },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, include: { attachments: true } },
        correctionRequests: { orderBy: { createdAt: "desc" } },
        grade: true,
        student: true,
        assignment: true,
      },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    return NextResponse.json(submission);
  } catch {
    return NextResponse.json({ error: "Failed to read submission" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();
    if (!body.score === undefined || body.score === null || !body.gradedBy) {
      return NextResponse.json({ error: "gradedBy and score are required" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: { id, ...submissionScopeFilter(auth.scope!.campusId) },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 }, grade: true, assignment: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    if (submission.grade) return NextResponse.json({ error: "Grade already exists" }, { status: 409 });

    const grader = await prisma.user.findFirst({
      where: {
        id: body.gradedBy,
        ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
      },
    });
    if (!grader) return NextResponse.json({ error: "Grader not found" }, { status: 404 });

    const latestVersion = submission.versions[0];
    if (!latestVersion) return NextResponse.json({ error: "No versions to grade" }, { status: 400 });

    const score = Number(body.score);
    if (score < 0) return NextResponse.json({ error: "Score cannot be negative" }, { status: 400 });
    if (score > submission.assignment.points) {
      return NextResponse.json({ error: `Score cannot exceed max points (${submission.assignment.points})` }, { status: 400 });
    }

    const grade = await prisma.grade.create({
      data: {
        submissionId: id,
        score,
        feedback: body.feedback || "",
        gradedVersion: latestVersion.versionNumber,
        gradedBy: body.gradedBy,
      },
      include: { grader: true },
    });

    return NextResponse.json(grade, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.grade.findFirst({
      where: {
        submissionId: id,
        submission: submissionScopeFilter(auth.scope!.campusId),
      },
      include: { submission: { include: { assignment: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Grade not found" }, { status: 404 });

    const score = body.score !== undefined ? Number(body.score) : existing.score;
    if (score < 0) return NextResponse.json({ error: "Score cannot be negative" }, { status: 400 });
    if (score > existing.submission.assignment.points) {
      return NextResponse.json({ error: `Score cannot exceed max points (${existing.submission.assignment.points})` }, { status: 400 });
    }

    const grade = await prisma.grade.update({
      where: { submissionId: id },
      data: {
        ...(body.score !== undefined ? { score } : {}),
        ...(body.feedback !== undefined ? { feedback: body.feedback } : {}),
        gradedAt: new Date(),
      },
      include: { grader: true },
    });

    return NextResponse.json(grade);
  } catch {
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
  }
}
