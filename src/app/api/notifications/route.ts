import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where = userId ? { userId } : {};

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: "Failed to read notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json({ error: "userId, type, title, and message are required" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId: body.userId,
        type: body.type,
        title: body.title,
        message: body.message,
        classId: body.classId || null,
        relatedId: body.relatedId || null,
        relatedEntity: body.relatedEntity || null,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
