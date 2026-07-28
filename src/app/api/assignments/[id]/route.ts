import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.attachment.findUnique({ where: { id } });
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
    const { id } = await params;
    const existing = await prisma.attachment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    await prisma.attachment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
  }
}
