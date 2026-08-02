-- DropIndex
DROP INDEX "cycles_code_key";

-- DropIndex
DROP INDEX "cycles_order_key";

-- DropIndex
DROP INDEX "semesters_code_key";

-- DropIndex
DROP INDEX "subjects_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "cycles_campusId_code_key" ON "cycles"("campusId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_campusId_order_key" ON "cycles"("campusId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_campusId_code_key" ON "semesters"("campusId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_campusId_code_key" ON "subjects"("campusId", "code");
