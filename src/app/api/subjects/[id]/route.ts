import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope, campusWhere } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const subject = await prisma.subject.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    return NextResponse.json(subject);
  } catch {
    return NextResponse.json({ error: "Failed to read subject" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subject.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.subject.findFirst({
        where: { code: body.code, NOT: { id }, ...campusWhere(auth.scope) },
      });
      if (duplicate) {
        return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.color !== undefined) data.color = body.color;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.active !== undefined) data.active = body.active;

    const subject = await prisma.subject.update({ where: { id }, data });
    return NextResponse.json(subject);
  } catch {
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
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
    const existing = await prisma.subject.findFirst({
      where: { id, ...campusWhere(auth.scope) },
    });
    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    await prisma.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
