import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const { reqId } = await request.json();
    if (!reqId) {
      return NextResponse.json({ error: "reqId is required" }, { status: 400 });
    }
    const correction = await prisma.correctionRequest.findFirst({
      where: { id: reqId, submissionId: id },
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
