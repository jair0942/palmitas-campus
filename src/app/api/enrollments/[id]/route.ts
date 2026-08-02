import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCampusScope, writeCampusError } from "@/lib/campus-scope";
import { enrollmentReadWhere } from "@/lib/enrollment-scope";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;

    const { id } = await params;
    const existing = await prisma.enrollment.findFirst({
      where: { id, ...enrollmentReadWhere(auth.scope!) } as never,
      include: { student: true, semester: true, academicGroup: true },
    });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    return NextResponse.json(existing);
  } catch {
    return NextResponse.json({ error: "Failed to read enrollment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const writeError = writeCampusError(auth.scope);
    if (writeError) return writeError;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.enrollment.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
    });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    if (body.academicGroupId) {
      const group = await prisma.academicGroup.findFirst({
        where: {
          id: body.academicGroupId,
          ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
        },
      });
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
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const existing = await prisma.enrollment.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
    });
    if (!existing) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });

    await prisma.enrollment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete enrollment" }, { status: 500 });
  }
}
