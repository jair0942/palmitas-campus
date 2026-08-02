import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const logModule = searchParams.get("module");

    const where: Record<string, unknown> = {};
    if (auth.scope!.campusId) {
      where.user = { campusId: auth.scope!.campusId };
    }
    if (userId) {
      if (where.user) {
        where.AND = [{ user: where.user }, { userId }];
        delete where.user;
      } else {
        where.userId = userId;
      }
    }
    if (logModule) {
      where.module = logModule;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Failed to read audit logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!body.action || !body.module) {
      return NextResponse.json({ error: "action and module are required" }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: body.userId || auth.scope!.userId,
        action: body.action,
        module: body.module,
        tableName: body.tableName || null,
        recordId: body.recordId || null,
        result: body.result || "success",
        metadata: body.metadata || undefined,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create audit log" }, { status: 500 });
  }
}
