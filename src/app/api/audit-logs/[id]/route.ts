import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCampusScope } from "@/lib/campus-scope";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    const log = await prisma.auditLog.findFirst({
      where: {
        id,
        ...(auth.scope!.campusId ? { user: { campusId: auth.scope!.campusId } } : {}),
      },
    });
    if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "Failed to read audit log" }, { status: 500 });
  }
}
