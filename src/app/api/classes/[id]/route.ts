import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const comment = await prisma.comment.update({
      where: { id },
      data: {
        ...(body.content !== undefined ? { content: body.content } : {}),
      },
      include: { author: true },
    });

    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
