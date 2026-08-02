import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");

    const where: Record<string, unknown> = {};
    if (auth.scope!.campusId) {
      where.class = { academicGroup: { campusId: auth.scope!.campusId } };
    }
    if (classId) {
      where.classId = classId;
    }

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
    const auth = await requireCampusScope(request, ["admin", "teacher", "student"]);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.classId || !body.content) {
      return NextResponse.json({ error: "classId and content are required" }, { status: 400 });
    }

    const cls = await prisma.class.findFirst({
      where: {
        id: body.classId,
        ...(auth.scope!.campusId
          ? { academicGroup: { campusId: auth.scope!.campusId } }
          : {}),
      },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    const authorId = body.authorId || auth.user!.id;
    const user = await prisma.user.findFirst({
      where: {
        id: authorId,
        ...(auth.scope!.campusId ? { campusId: auth.scope!.campusId } : {}),
      },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const post = await prisma.post.create({
      data: {
        classId: body.classId,
        authorId,
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
