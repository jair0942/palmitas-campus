import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const assignmentId = searchParams.get("assignmentId");

    const where: Record<string, string> = {};
    if (postId) where.postId = postId;
    if (assignmentId) where.assignmentId = assignmentId;

    const attachments = await prisma.attachment.findMany({
      where,
      include: { fileAsset: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(attachments);
  } catch {
    return NextResponse.json({ error: "Failed to read attachments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.size || !body.type || !body.url) {
      return NextResponse.json({ error: "name, size, type, and url are required" }, { status: 400 });
    }

    if (body.postId) {
      const post = await prisma.post.findUnique({ where: { id: body.postId } });
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (body.assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
      if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (!body.postId && !body.assignmentId) {
      return NextResponse.json({ error: "Attachment must belong to a post or assignment" }, { status: 400 });
    }

    if (body.fileAssetId) {
      const fileAsset = await prisma.fileAsset.findUnique({ where: { id: body.fileAssetId } });
      if (!fileAsset) return NextResponse.json({ error: "File asset not found" }, { status: 404 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        name: body.name,
        size: body.size,
        type: body.type,
        url: body.url,
        fileAssetId: body.fileAssetId || null,
        postId: body.postId || null,
        assignmentId: body.assignmentId || null,
      },
      include: { fileAsset: true },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create attachment" }, { status: 500 });
  }
}
