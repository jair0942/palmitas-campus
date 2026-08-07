-- AlterTable
ALTER TABLE "file_assets" ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "protectedFromCleanup" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "file_assets_expiresAt_protectedFromCleanup_idx" ON "file_assets"("expiresAt", "protectedFromCleanup");

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_campusId_key" ON "retention_policies"("campusId");

-- CreateTable
CREATE TABLE "cleanup_runs" (
    "id" TEXT NOT NULL,
    "campusId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "deletedFiles" INTEGER NOT NULL DEFAULT 0,
    "bytesFreed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "cleanup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cleanup_runs_startedAt_idx" ON "cleanup_runs"("startedAt");

-- CreateIndex
CREATE INDEX "cleanup_runs_status_idx" ON "cleanup_runs"("status");

-- AddForeignKey
ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
