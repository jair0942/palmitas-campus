import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const logModule = searchParams.get("module");

    const where: Record<string, string> = {};
    if (userId) where.userId = userId;
    if (logModule) where.module = logModule;

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
    const body = await request.json();
    if (!body.action || !body.module) {
      return NextResponse.json({ error: "action and module are required" }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: body.userId || null,
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
