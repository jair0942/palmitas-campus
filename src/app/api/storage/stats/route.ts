import { NextRequest, NextResponse } from "next/server";
import { requireCampusScope } from "@/lib/campus-scope";
import { prisma } from "@/lib/prisma";
import { getRetentionDays, EXPIRING_SOON_DAYS } from "@/lib/retention";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireCampusScope(request, ["admin"]);
    if (auth.error) return auth.error;

    const campusId = auth.scope!.campusId;
    if (!campusId) {
      return NextResponse.json(
        { error: "Debe seleccionar una sede para ver el almacenamiento" },
        { status: 400 }
      );
    }

    const now = new Date();
    const soon = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    const campusFilter = { uploader: { campusId } };

    const [totalFiles, sizeAgg, expiringSoon, expiredPending, protectedCount, legacyCount, retentionDays, lastRun] =
      await Promise.all([
        prisma.fileAsset.count({ where: campusFilter }),
        prisma.fileAsset.aggregate({ where: campusFilter, _sum: { sizeBytes: true } }),
        prisma.fileAsset.count({
          where: {
            ...campusFilter,
            expiresAt: { gte: now, lte: soon },
            protectedFromCleanup: false,
          },
        }),
        prisma.fileAsset.count({
          where: { ...campusFilter, expiresAt: { lt: now }, protectedFromCleanup: false },
        }),
        prisma.fileAsset.count({ where: { ...campusFilter, protectedFromCleanup: true } }),
        prisma.fileAsset.count({ where: { ...campusFilter, expiresAt: null } }),
        getRetentionDays(campusId),
        prisma.cleanupRun.findFirst({ orderBy: { startedAt: "desc" } }),
      ]);

    const [expiringSoonAssets, expiredAssets] = await Promise.all([
      prisma.fileAsset.findMany({
        where: {
          ...campusFilter,
          expiresAt: { gte: now, lte: soon },
          protectedFromCleanup: false,
        },
        select: { id: true, originalName: true, sizeBytes: true, createdAt: true, expiresAt: true, protectedFromCleanup: true },
        orderBy: { expiresAt: "asc" },
        take: 20,
      }),
      prisma.fileAsset.findMany({
        where: { ...campusFilter, expiresAt: { lt: now }, protectedFromCleanup: false },
        select: { id: true, originalName: true, sizeBytes: true, createdAt: true, expiresAt: true, protectedFromCleanup: true },
        orderBy: { expiresAt: "asc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      totalFiles,
      totalBytes: sizeAgg._sum.sizeBytes ?? 0,
      expiringSoon,
      expiredPending,
      protectedCount,
      legacyCount,
      retentionDays,
      expiringSoonAssets,
      expiredAssets,
      lastRun,
    });
  } catch {
    return NextResponse.json({ error: "Failed to read storage stats" }, { status: 500 });
  }
}
