import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    if (auth.error) return auth.error;
    const { id } = await params;
    const log = await prisma.auditLog.findUnique({ where: { id } });
    if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 });
  }
}
