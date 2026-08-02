-- AlterTable
ALTER TABLE "academic_groups" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "teaching_assignments" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "campusId" TEXT;

-- CreateTable
CREATE TABLE "campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campus_code_key" ON "campus"("code");

-- CreateIndex
CREATE INDEX "academic_groups_campusId_idx" ON "academic_groups"("campusId");

-- CreateIndex
CREATE INDEX "cycles_campusId_idx" ON "cycles"("campusId");

-- CreateIndex
CREATE INDEX "semesters_campusId_idx" ON "semesters"("campusId");

-- CreateIndex
CREATE INDEX "subjects_campusId_idx" ON "subjects"("campusId");

-- CreateIndex
CREATE INDEX "teaching_assignments_campusId_idx" ON "teaching_assignments"("campusId");

-- CreateIndex
CREATE INDEX "users_campusId_idx" ON "users"("campusId");

-- CreateIndex
CREATE INDEX "users_campusId_roleId_idx" ON "users"("campusId", "roleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_groups" ADD CONSTRAINT "academic_groups_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teaching_assignments" ADD CONSTRAINT "teaching_assignments_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
