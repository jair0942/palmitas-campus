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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const submissionId = searchParams.get("submissionId");

    const where: Record<string, unknown> = commentScopeFilter(auth.scope!.campusId);
    if (postId) {
      if (where.OR) {
        where.AND = [{ OR: (where as { OR: unknown[] }).OR }, { postId }];
        delete where.OR;
      } else {
        where.postId = postId;
      }
    }
    if (submissionId) {
      if (where.AND) {
        (where.AND as Record<string, unknown>[]).push({ submissionId });
      } else if (where.OR) {
        where.AND = [{ OR: (where as { OR: unknown[] }).OR }, { submissionId }];
        delete where.OR;
      } else {
        where.submissionId = submissionId;
      }
    }

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
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.authorId || !body.content) {
      return NextResponse.json({ error: "authorId and content are required" }, { status: 400 });
    }
    if (!body.postId && !body.submissionId) {
      return NextResponse.json({ error: "postId or submissionId is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: body.authorId,
        ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (body.postId) {
      const post = await prisma.post.findFirst({
        where: {
          id: body.postId,
          ...(auth.scope!.campusId
            ? { class: { academicGroup: { campusId: auth.scope!.campusId } } }
            : {}),
        },
      });
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (body.submissionId) {
      const submission = await prisma.submission.findFirst({
        where: {
          id: body.submissionId,
          ...(auth.scope!.campusId
            ? { assignment: { class: { academicGroup: { campusId: auth.scope!.campusId } } } }
            : {}),
        },
      });
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
