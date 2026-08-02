import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

function submissionScopeFilter(campusId: string | null) {
  if (!campusId) return {};
  return { submission: { assignment: { class: { academicGroup: { campusId } } } } };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id, reqId } = await params;

    const correction = await prisma.correctionRequest.findFirst({
      where: { id: reqId, submissionId: id, ...submissionScopeFilter(auth.scope!.campusId) },
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
