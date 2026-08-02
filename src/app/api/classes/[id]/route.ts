import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const cls = await prisma.class.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
      include: { teachingAssignment: true, academicGroup: true, subject: true },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(cls);
  } catch {
    return NextResponse.json({ error: "Failed to read class" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.class.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
    });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const campusId = existing.academicGroupId
      ? (await prisma.academicGroup.findUnique({ where: { id: existing.academicGroupId } }))?.campusId
      : null;

    if (body.academicGroupId && body.academicGroupId !== existing.academicGroupId) {
      const group = await prisma.academicGroup.findFirst({ where: { id: body.academicGroupId, campusId: campusId ?? undefined } });
      if (!group) return NextResponse.json({ error: "Academic group not found" }, { status: 404 });
    }

    if (body.teachingAssignmentId && body.teachingAssignmentId !== existing.teachingAssignmentId) {
      const ta = await prisma.teachingAssignment.findFirst({ where: { id: body.teachingAssignmentId, campusId: campusId ?? undefined } });
      if (!ta) return NextResponse.json({ error: "Teaching assignment not found" }, { status: 404 });
    }

    if (body.subjectId) {
      const subject = await prisma.subject.findFirst({ where: { id: body.subjectId, campusId: campusId ?? undefined } });
      if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.section !== undefined) data.section = body.section;
    if (body.description !== undefined) data.description = body.description;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId || null;
    if (body.academicGroupId !== undefined) data.academicGroupId = body.academicGroupId;
    if (body.teachingAssignmentId !== undefined) data.teachingAssignmentId = body.teachingAssignmentId;

    const cls = await prisma.class.update({
      where: { id },
      data,
      include: { teachingAssignment: true, academicGroup: true, subject: true },
    });

    return NextResponse.json(cls);
  } catch {
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.class.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
    });
    if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    await prisma.class.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}
