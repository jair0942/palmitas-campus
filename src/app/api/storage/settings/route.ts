import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";
import { getRetentionDays, RETENTION_OPTIONS, DEFAULT_RETENTION_DAYS } from "@/lib/retention";

function requireCampus(campusId: string | null) {
  if (!campusId) {
    return NextResponse.json(
      { error: "Debe seleccionar una sede para configurar la retención" },
      { status: 400 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const campusError = requireCampus(auth.scope!.campusId);
    if (campusError) return campusError;

    const retentionDays = await getRetentionDays(auth.scope!.campusId);
    return NextResponse.json({ retentionDays, options: RETENTION_OPTIONS, defaultRetentionDays: DEFAULT_RETENTION_DAYS });
  } catch {
    return NextResponse.json({ error: "Failed to read retention settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;
    const campusError = requireCampus(auth.scope!.campusId);
    if (campusError) return campusError;

    const campusId = auth.scope!.campusId!;
    const body = await request.json();
    const retentionDays = Number(body.retentionDays);

    if (!RETENTION_OPTIONS.includes(retentionDays as (typeof RETENTION_OPTIONS)[number])) {
      return NextResponse.json(
        { error: `retentionDays debe ser uno de: ${RETENTION_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const policy = await prisma.retentionPolicy.upsert({
      where: { campusId },
      update: { retentionDays, updatedBy: auth.scope!.userId },
      create: { campusId, retentionDays, updatedBy: auth.scope!.userId },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.scope!.userId,
        action: "UPDATE_RETENTION_POLICY",
        module: "storage",
        tableName: "retention_policies",
        recordId: policy.id,
        result: "success",
        metadata: { campusId, retentionDays },
      },
    });

    return NextResponse.json({ id: policy.id, campusId, retentionDays });
  } catch {
    return NextResponse.json({ error: "Failed to update retention settings" }, { status: 500 });
  }
}
