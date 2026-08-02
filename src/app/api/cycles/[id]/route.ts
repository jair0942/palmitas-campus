import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.cycle.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.cycle.findFirst({
        where: { code: body.code, NOT: { id }, ...campusWhere(auth.scope) },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Cycle code already exists" }, { status: 409 });
      }
    }

    if (body.order != null && body.order !== existing.order) {
      const duplicate = await prisma.cycle.findFirst({
        where: { order: body.order, NOT: { id }, ...campusWhere(auth.scope) },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Cycle order already exists" }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.code !== undefined) data.code = body.code;
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.order !== undefined) data.order = body.order;
    if (body.usesSubjects !== undefined) data.usesSubjects = body.usesSubjects;
    if (body.active !== undefined) data.active = body.active;

    const cycle = await prisma.cycle.update({ where: { id }, data });
    return NextResponse.json(cycle);
  } catch {
    return NextResponse.json({ error: "Failed to update cycle" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.cycle.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    const hasGroups = await prisma.academicGroup.count({ where: { cycleId: id } });
    if (hasGroups > 0) {
      return NextResponse.json({ error: "Cannot delete cycle with academic groups" }, { status: 409 });
    }

    await prisma.cycle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete cycle" }, { status: 500 });
  }
}
