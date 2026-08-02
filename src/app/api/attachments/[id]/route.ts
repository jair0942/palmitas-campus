import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

function attachmentScopeFilter(campusId: string | null) {
  if (!campusId) return {};
  return {
    OR: [
      { post: { class: { academicGroup: { campusId } } } },
      { assignment: { class: { academicGroup: { campusId } } } },
      { version: { submission: { assignment: { class: { academicGroup: { campusId } } } } } },
    ],
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const attachment = await prisma.attachment.findFirst({
      where: { id, ...attachmentScopeFilter(auth.scope!.campusId) },
      include: { fileAsset: true },
    });
    if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    return NextResponse.json(attachment);
  } catch {
    return NextResponse.json({ error: "Failed to read attachment" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.attachment.findFirst({
      where: { id, ...attachmentScopeFilter(auth.scope!.campusId) },
    });
    if (!existing) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    const attachment = await prisma.attachment.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
      },
      include: { fileAsset: true },
    });

    return NextResponse.json(attachment);
  } catch {
    return NextResponse.json({ error: "Failed to update attachment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.attachment.findFirst({
      where: { id, ...attachmentScopeFilter(auth.scope!.campusId) },
    });
    if (!existing) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
