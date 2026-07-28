import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.semester.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.semester.findUnique({ where: { code: body.code } });
      if (duplicate) {
        return NextResponse.json({ error: "Semester code already exists" }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.name !== undefined) data.name = body.name;
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate);

    const semester = await prisma.semester.update({ where: { id }, data });
    return NextResponse.json(semester);
  } catch {
    return NextResponse.json({ error: "Failed to update semester" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const existing = await prisma.semester.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    const hasGroups = await prisma.academicGroup.count({ where: { semesterId: id } });
    const hasEnrollments = await prisma.enrollment.count({ where: { semesterId: id } });
    if (hasGroups > 0 || hasEnrollments > 0) {
      return NextResponse.json({ error: "Cannot delete semester with academic groups or enrollments" }, { status: 409 });
    }

    await prisma.semester.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete semester" }, { status: 500 });
  }
}
