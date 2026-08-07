import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { assertAssignmentWritable } from "@/lib/class-access-guard";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { class: { academicGroup: { campusId: auth.scope!.campusId } } }
          : {}),
      },
      include: { attachments: { include: { fileAsset: true } } },
    });
    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    return NextResponse.json(assignment);
  } catch {
    return NextResponse.json({ error: "Failed to read assignment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    // Autorización backend: teacher solo modifica tareas de clases que enseña.
    const guard = await assertAssignmentWritable(auth.scope!, id);
    if (guard.error) return guard.error;
    const existing = guard.assignment!;

    if (body.points !== undefined && Number(body.points) < 0) {
      return NextResponse.json({ error: "Points cannot be negative" }, { status: 400 });
    }

    const publishAt = body.publishAt ? new Date(body.publishAt) : existing.publishAt;
    const dueDate = body.dueDate ? new Date(body.dueDate) : existing.dueDate;

    if (dueDate < publishAt) {
      return NextResponse.json({ error: "Due date cannot be before publish date" }, { status: 400 });
    }

    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.points !== undefined ? { points: Number(body.points) } : {}),
        ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
        ...(body.publishAt !== undefined ? { publishAt: new Date(body.publishAt) } : {}),
      },
      include: { attachments: { include: { fileAsset: true } } },
    });

    return NextResponse.json(assignment);
  } catch {
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;

    // Autorización backend: teacher solo elimina tareas de clases que enseña.
    const guard = await assertAssignmentWritable(auth.scope!, id);
    if (guard.error) return guard.error;

    const subCount = await prisma.submission.count({ where: { assignmentId: id } });
    if (subCount > 0) {
      return NextResponse.json({ error: "Cannot delete assignment with submissions" }, { status: 409 });
    }

    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
