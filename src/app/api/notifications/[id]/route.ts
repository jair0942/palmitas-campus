import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(body.content !== undefined ? { content: body.content } : {}),
      },
      include: { author: true, comments: { include: { author: true } }, attachments: true },
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
