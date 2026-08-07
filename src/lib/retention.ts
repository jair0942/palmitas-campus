import { prisma } from "./prisma";
import storage from "./storage";
import { Prisma, StorageProvider } from "../generated/prisma/client";

export const DEFAULT_RETENTION_DAYS = 90;
export const RETENTION_OPTIONS = [30, 60, 90, 180] as const;
export const EXPIRING_SOON_DAYS = 7;
export const CLEANUP_BATCH_LIMIT = 200;
export const CLEANUP_MAX_LIMIT = 1000;

export async function getRetentionDays(campusId: string | null): Promise<number> {
  if (!campusId) return DEFAULT_RETENTION_DAYS;
  const policy = await prisma.retentionPolicy.findUnique({ where: { campusId } });
  return policy?.retentionDays ?? DEFAULT_RETENTION_DAYS;
}

export function computeExpiresAt(createdAt: Date, retentionDays: number): Date {
  const d = new Date(createdAt);
  d.setUTCDate(d.getUTCDate() + retentionDays);
  return d;
}

export interface CleanupError {
  assetId?: string;
  stage: string;
  message: string;
}

export interface CleanupSummary {
  runId: string;
  startedAt: Date;
  finishedAt: Date;
  status: "success" | "partial" | "failed";
  deletedFiles: number;
  bytesFreed: number;
  errors: CleanupError[];
}

async function getInstitutionLogoAssetIds(): Promise<Set<string>> {
  const settings = await prisma.institutionSettings.findMany({
    select: { logoFileId: true, shieldFileId: true, faviconFileId: true },
  });
  const ids = new Set<string>();
  for (const s of settings) {
    if (s.logoFileId) ids.add(s.logoFileId);
    if (s.shieldFileId) ids.add(s.shieldFileId);
    if (s.faviconFileId) ids.add(s.faviconFileId);
  }
  return ids;
}

export async function runStorageCleanup(opts: { limit?: number } = {}): Promise<CleanupSummary> {
  const limit = Math.min(opts.limit ?? CLEANUP_BATCH_LIMIT, CLEANUP_MAX_LIMIT);
  const startedAt = new Date();
  const run = await prisma.cleanupRun.create({ data: { startedAt } });

  const errors: CleanupError[] = [];
  let deletedFiles = 0;
  let bytesFreed = 0;
  let status: CleanupSummary["status"] = "success";

  try {
    const protectedIds = await getInstitutionLogoAssetIds();

    const candidates = await prisma.fileAsset.findMany({
      where: {
        expiresAt: { lt: startedAt },
        protectedFromCleanup: false,
        storageProvider: StorageProvider.EXTERNAL,
      },
      select: { id: true, storedName: true, sizeBytes: true },
      orderBy: { expiresAt: "asc" },
      take: limit,
    });

    for (const asset of candidates) {
      if (protectedIds.has(asset.id)) {
        continue;
      }
      try {
        await prisma.attachment.deleteMany({ where: { fileAssetId: asset.id } });

        try {
          await storage.delete(asset.storedName);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!/not found/i.test(msg)) {
            throw err;
          }
        }

        await prisma.fileAsset.delete({ where: { id: asset.id } });
        deletedFiles += 1;
        bytesFreed += asset.sizeBytes;
      } catch (err) {
        status = "partial";
        errors.push({
          assetId: asset.id,
          stage: "cleanup",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await prisma.cleanupRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status,
        deletedFiles,
        bytesFreed,
        errors: errors.length ? (errors as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (err) {
    status = "failed";
    errors.push({
      stage: "engine",
      message: err instanceof Error ? err.message : String(err),
    });
    await prisma.cleanupRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status,
        deletedFiles,
        bytesFreed,
        errors: errors as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return {
    runId: run.id,
    startedAt,
    finishedAt: new Date(),
    status,
    deletedFiles,
    bytesFreed,
    errors,
  };
}
