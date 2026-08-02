import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};
    if (auth.scope!.role === "admin") {
      if (userId) {
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        if (auth.scope!.campusId && targetUser.campusId !== auth.scope!.campusId) {
          return NextResponse.json(
            { error: "No puede consultar notificaciones de usuarios de otra sede" },
            { status: 403 }
          );
        }
        where.userId = userId;
      }
    } else {
      where.userId = auth.scope!.userId;
    }

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
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json({ error: "userId, type, title, and message are required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (auth.scope!.campusId && targetUser.campusId !== auth.scope!.campusId) {
      return NextResponse.json(
        { error: "No puede notificar a usuarios de otra sede" },
        { status: 403 }
      );
    }
    if (auth.scope!.role !== "admin" && body.userId !== auth.scope!.userId) {
      return NextResponse.json(
        { error: "Solo puede crear notificaciones para sí mismo" },
        { status: 403 }
      );
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
