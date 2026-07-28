import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.enrollment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    if (body.academicGroupId) {
      const group = await prisma.academicGroup.findUnique({ where: { id: body.academicGroupId } });
      if (!group) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });
      if (group.semesterId !== existing.semesterId) {
        return NextResponse.json({ error: "Group does not belong to the same semester" }, { status: 400 });
      }
    }

    const enrollment = await prisma.enrollment.update({
      where: { id },
      data: {
        ...(body.academicGroupId !== undefined ? { academicGroupId: body.academicGroupId } : {}),
        ...(body.status !== undefined ? { status: body.status, withdrawnAt: body.status === "WITHDRAWN" ? new Date() : undefined } : {}),
      },
      include: { student: true, semester: true, academicGroup: true },
    });

    return NextResponse.json(enrollment);
  } catch {
    return NextResponse.json({ error: "Failed to update enrollment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.enrollment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    await prisma.enrollment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete enrollment" }, { status: 500 });
  }
}
