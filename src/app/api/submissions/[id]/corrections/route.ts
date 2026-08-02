import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

function submissionScopeFilter(campusId: string | null) {
  if (!campusId) return {};
  return { assignment: { class: { academicGroup: { campusId } } } };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();
    if (!body.teacherId || !body.observations) {
      return NextResponse.json({ error: "teacherId and observations are required" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: { id, ...submissionScopeFilter(auth.scope!.campusId) },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const teacher = await prisma.user.findFirst({
      where: {
        id: body.teacherId,
        ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
      },
    });
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const latestVersion = submission.versions[0];
    if (!latestVersion) return NextResponse.json({ error: "No versions to request correction on" }, { status: 400 });

    const correction = await prisma.correctionRequest.create({
      data: {
        submissionId: id,
        versionId: latestVersion.id,
        teacherId: body.teacherId,
        observations: body.observations,
      },
      include: { teacher: true },
    });

    return NextResponse.json(correction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create correction request" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const { reqId } = await request.json();
    if (!reqId) {
      return NextResponse.json({ error: "reqId is required" }, { status: 400 });
    }
    const correction = await prisma.correctionRequest.findFirst({
      where: { id: reqId, submissionId: id, submission: submissionScopeFilter(auth.scope!.campusId) },
    });
    if (!correction) return NextResponse.json({ error: "Correction request not found" }, { status: 404 });

    const updated = await prisma.correctionRequest.update({
      where: { id: reqId },
      data: { status: "closed", closedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to close correction request" }, { status: 500 });
  }
}
