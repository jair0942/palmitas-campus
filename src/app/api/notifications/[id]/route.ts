import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id },
    });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    if (notification.userId !== auth.scope!.userId && auth.scope!.role !== "admin") {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }
    if (auth.scope!.campusId) {
      const owner = await prisma.user.findUnique({ where: { id: notification.userId } });
      if (!owner || owner.campusId !== auth.scope!.campusId) {
        return NextResponse.json(
          { error: "No puede acceder a notificaciones de otra sede" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(notification);
  } catch {
    return NextResponse.json({ error: "Failed to read notification" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.notification.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    if (existing.userId !== auth.scope!.userId && auth.scope!.role !== "admin") {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }
    if (auth.scope!.campusId) {
      const owner = await prisma.user.findUnique({ where: { id: existing.userId } });
      if (!owner || owner.campusId !== auth.scope!.campusId) {
        return NextResponse.json(
          { error: "No puede acceder a notificaciones de otra sede" },
          { status: 403 }
        );
      }
    }

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.notification.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    if (existing.userId !== auth.scope!.userId && auth.scope!.role !== "admin") {
      return NextResponse.json({ error: "Permiso denegado" }, { status: 403 });
    }
    if (auth.scope!.campusId) {
      const owner = await prisma.user.findUnique({ where: { id: existing.userId } });
      if (!owner || owner.campusId !== auth.scope!.campusId) {
        return NextResponse.json(
          { error: "No puede acceder a notificaciones de otra sede" },
          { status: 403 }
        );
      }
    }

    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
