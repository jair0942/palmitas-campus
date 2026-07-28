import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { userId: body.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
