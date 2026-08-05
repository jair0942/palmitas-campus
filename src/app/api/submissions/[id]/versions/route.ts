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
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const versions = await prisma.submissionVersion.findMany({
      where: { submissionId: id },
      include: { attachments: true },
      orderBy: { versionNumber: "desc" },
    });
    return NextResponse.json(versions);
  } catch {
    return NextResponse.json({ error: "Failed to read versions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher", "student"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();
    if (!body.content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: { id, ...submissionScopeFilter(auth.scope!.campusId) },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 }, grade: true, correctionRequests: { where: { status: "open" } } },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    if (auth.scope!.role === "student" && submission.studentId !== auth.scope!.userId) {
      return NextResponse.json({ error: "No puedes modificar la entrega de otro estudiante" }, { status: 403 });
    }

    if (submission.grade) {
      return NextResponse.json({ error: "Cannot create new version: submission already graded" }, { status: 409 });
    }

    const latestVersionNumber = submission.versions[0]?.versionNumber || 0;
    const nextVersionNumber = latestVersionNumber + 1;

    if (submission.correctionRequests.length > 0) {
      await prisma.correctionRequest.updateMany({
        where: { submissionId: id, status: "open" },
        data: { status: "closed", closedAt: new Date() },
      });
    }

    const version = await prisma.submissionVersion.create({
      data: {
        submissionId: id,
        versionNumber: nextVersionNumber,
        content: body.content,
        attachments: body.attachments?.length
          ? { create: body.attachments.map((a: { name: string; size: string; type: string; url: string; fileAssetId?: string }) => ({ name: a.name, size: a.size, type: a.type, url: a.url, fileAssetId: a.fileAssetId || null })) }
          : undefined,
      },
      include: { attachments: true },
    });

    return NextResponse.json(version, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
}
