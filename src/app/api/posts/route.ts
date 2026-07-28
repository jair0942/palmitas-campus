import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const where = classId ? { classId } : {};

    const posts = await prisma.post.findMany({
      where,
      include: { author: true, comments: { include: { author: true } }, attachments: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "Failed to read posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.classId || !body.content) {
      return NextResponse.json({ error: "classId and content are required" }, { status: 400 });
    }

    const cls = await prisma.class.findUnique({ where: { id: body.classId } });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { id: body.authorId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const post = await prisma.post.create({
      data: {
        classId: body.classId,
        authorId: body.authorId,
        content: body.content,
        attachments: body.attachments?.length
          ? { create: body.attachments.map((a: { name: string; size: string; type: string; url: string; fileAssetId?: string }) => ({ name: a.name, size: a.size, type: a.type, url: a.url, fileAssetId: a.fileAssetId || null })) }
          : undefined,
      },
      include: { author: true, comments: { include: { author: true } }, attachments: true },
    });

    return NextResponse.json(post, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
