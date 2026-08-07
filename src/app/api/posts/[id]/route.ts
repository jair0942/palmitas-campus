import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { assertPostWritable } from "@/lib/class-access-guard";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId
          ? { class: { academicGroup: { campusId: auth.scope!.campusId } } }
          : {}),
      },
      include: { author: true, comments: { include: { author: true } }, attachments: { include: { fileAsset: true } } },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to read post" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    // Autorización backend: teacher modifica publicaciones de sus clases o propias.
    const guard = await assertPostWritable(auth.scope!, id);
    if (guard.error) return guard.error;

    const data: Record<string, unknown> = {};
    if (body.content !== undefined) data.content = body.content;

    const post = await prisma.post.update({
      where: { id },
      data,
      include: { author: true, comments: { include: { author: true } }, attachments: { include: { fileAsset: true } } },
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireCampusScope(request, ["admin", "teacher"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    // Autorización backend: teacher elimina publicaciones de sus clases o propias.
    const guard = await assertPostWritable(auth.scope!, id);
    if (guard.error) return guard.error;

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
