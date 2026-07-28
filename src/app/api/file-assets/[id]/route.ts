import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        ...(body.isRead !== undefined ? { isRead: body.isRead, readAt: body.isRead ? new Date() : null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
