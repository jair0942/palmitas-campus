import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const submission = await prisma.submission.findUnique({
      where: { id },
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
