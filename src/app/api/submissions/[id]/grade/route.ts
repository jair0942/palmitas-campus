import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, ["admin", "teacher", "student"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();
    if (!body.content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 }, grade: true, correctionRequests: { where: { status: "open" } } },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

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
          ? { create: body.attachments.map((a: { name: string; size: string; type: string; url: string }) => ({ name: a.name, size: a.size, type: a.type, url: a.url })) }
          : undefined,
      },
      include: { attachments: true },
    });

    return NextResponse.json(version, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create version" }, { status: 500 });
  }
}
