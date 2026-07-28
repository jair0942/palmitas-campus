import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const submissionId = searchParams.get("submissionId");

    const where: Record<string, string> = {};
    if (postId) where.postId = postId;
    if (submissionId) where.submissionId = submissionId;

    const comments = await prisma.comment.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: "Failed to read comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.authorId || !body.content) {
      return NextResponse.json({ error: "authorId and content are required" }, { status: 400 });
    }
    if (!body.postId && !body.submissionId) {
      return NextResponse.json({ error: "postId or submissionId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: body.authorId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (body.postId) {
      const post = await prisma.post.findUnique({ where: { id: body.postId } });
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (body.submissionId) {
      const submission = await prisma.submission.findUnique({ where: { id: body.submissionId } });
      if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        postId: body.postId || null,
        submissionId: body.submissionId || null,
        authorId: body.authorId,
        content: body.content,
      },
      include: { author: true },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
