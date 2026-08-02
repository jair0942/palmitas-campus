import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

function commentScopeFilter(campusId: string | null) {
  if (!campusId) return {};
  return {
    OR: [
      { post: { class: { academicGroup: { campusId } } } },
      { submission: { assignment: { class: { academicGroup: { campusId } } } } },
    ],
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const comment = await prisma.comment.findFirst({
      where: { id, ...commentScopeFilter(auth.scope!.campusId) },
      include: { author: true },
    });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ error: "Failed to read comment" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.comment.findFirst({
      where: { id, ...commentScopeFilter(auth.scope!.campusId) },
    });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    if (auth.scope!.role !== "admin" && existing.authorId !== auth.scope!.userId) {
      return NextResponse.json({ error: "Solo el autor puede editar el comentario" }, { status: 403 });
    }

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
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.comment.findFirst({
      where: { id, ...commentScopeFilter(auth.scope!.campusId) },
    });
    if (!existing) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    if (auth.scope!.role !== "admin" && existing.authorId !== auth.scope!.userId) {
      return NextResponse.json({ error: "Solo el autor puede eliminar el comentario" }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
