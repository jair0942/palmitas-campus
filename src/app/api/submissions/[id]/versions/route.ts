import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const corrections = await prisma.correctionRequest.findMany({
      where: { submissionId: id },
      include: { teacher: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(corrections);
  } catch {
    return NextResponse.json({ error: "Failed to read correction requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.teacherId || !body.observations) {
      return NextResponse.json({ error: "teacherId and observations are required" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const teacher = await prisma.user.findUnique({ where: { id: body.teacherId } });
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
