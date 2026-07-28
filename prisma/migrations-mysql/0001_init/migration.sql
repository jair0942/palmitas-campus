 

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL DEFAULT '',
    `documentNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL DEFAULT 'STUDENT',
    `avatar` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `blocked` BOOLEAN NOT NULL DEFAULT false,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semesters` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `semesters_code_key`(`code`),
    INDEX `semesters_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cycles` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `order` INTEGER NOT NULL,
    `usesSubjects` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `cycles_code_key`(`code`),
    UNIQUE INDEX `cycles_order_key`(`order`),
    INDEX `cycles_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#0F6A3B',
    `icon` VARCHAR(191) NOT NULL DEFAULT 'book-open',
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `subjects_code_key`(`code`),
    INDEX `subjects_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_groups` (
    `id` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `cycleId` VARCHAR(191) NOT NULL,
    `managerTeacherId` VARCHAR(191) NULL,
    `nameInternal` VARCHAR(191) NOT NULL,
    `nameForStudents` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `academic_groups_semesterId_idx`(`semesterId`),
    INDEX `academic_groups_cycleId_idx`(`cycleId`),
    INDEX `academic_groups_managerTeacherId_idx`(`managerTeacherId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teaching_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `cycleId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NULL,
    `academicGroupId` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `teaching_assignments_teacherId_idx`(`teacherId`),
    INDEX `teaching_assignments_cycleId_idx`(`cycleId`),
    INDEX `teaching_assignments_subjectId_idx`(`subjectId`),
    INDEX `teaching_assignments_academicGroupId_idx`(`academicGroupId`),
    UNIQUE INDEX `teaching_assignments_teacherId_cycleId_subjectId_academicGro_key`(`teacherId`, `cycleId`, `subjectId`, `academicGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enrollments` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NOT NULL,
    `academicGroupId` VARCHAR(191) NOT NULL,
    `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('ACTIVE', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `withdrawnAt` DATETIME(3) NULL,

    INDEX `enrollments_studentId_idx`(`studentId`),
    INDEX `enrollments_semesterId_idx`(`semesterId`),
    INDEX `enrollments_academicGroupId_idx`(`academicGroupId`),
    INDEX `enrollments_status_idx`(`status`),
    UNIQUE INDEX `enrollments_studentId_semesterId_academicGroupId_key`(`studentId`, `semesterId`, `academicGroupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `classes` (
    `id` VARCHAR(191) NOT NULL,
    `teachingAssignmentId` VARCHAR(191) NOT NULL,
    `academicGroupId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL DEFAULT '',
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `classes_teachingAssignmentId_idx`(`teachingAssignmentId`),
    INDEX `classes_academicGroupId_idx`(`academicGroupId`),
    INDEX `classes_subjectId_idx`(`subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `posts_classId_idx`(`classId`),
    INDEX `posts_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NULL,
    `submissionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `comments_authorId_idx`(`authorId`),
    INDEX `comments_postId_idx`(`postId`),
    INDEX `comments_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attachments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `fileAssetId` VARCHAR(191) NULL,
    `postId` VARCHAR(191) NULL,
    `assignmentId` VARCHAR(191) NULL,
    `submissionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `attachments_fileAssetId_idx`(`fileAssetId`),
    INDEX `attachments_postId_idx`(`postId`),
    INDEX `attachments_assignmentId_idx`(`assignmentId`),
    INDEX `attachments_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_assets` (
    `id` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `storedName` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `storageProvider` ENUM('LOCAL', 'S3', 'R2', 'EXTERNAL') NOT NULL DEFAULT 'LOCAL',
    `checksum` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `extension` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `file_assets_uploadedById_idx`(`uploadedById`),
    INDEX `file_assets_storageProvider_idx`(`storageProvider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `publishAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `assignments_classId_idx`(`classId`),
    INDEX `assignments_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `content` VARCHAR(191) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `submissions_assignmentId_idx`(`assignmentId`),
    INDEX `submissions_studentId_idx`(`studentId`),
    UNIQUE INDEX `submissions_assignmentId_studentId_version_key`(`assignmentId`, `studentId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grades` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `score` DOUBLE NOT NULL,
    `feedback` VARCHAR(191) NOT NULL DEFAULT '',
    `gradedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `grades_submissionId_key`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `corrections_requests` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `feedback` VARCHAR(191) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `corrections_requests_submissionId_key`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('NEW_ASSIGNMENT', 'NEW_POST', 'COMMENT', 'GRADE', 'SUBMISSION', 'NEW_USER', 'NEW_CLASS', 'CORRECTIONS_REQUESTED', 'RESUBMISSION') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NULL,
    `relatedId` VARCHAR(191) NULL,
    `relatedEntity` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `institution_settings` (
    `id` VARCHAR(191) NOT NULL,
    `schoolName` VARCHAR(191) NOT NULL,
    `logoFileId` VARCHAR(191) NULL,
    `shieldFileId` VARCHAR(191) NULL,
    `faviconFileId` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `shieldUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `motto` VARCHAR(191) NOT NULL DEFAULT '',
    `activeSemesterId` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#0F6A3B',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#F2C230',
    `accentColor` VARCHAR(191) NULL,
    `theme` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'LIGHT',
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `institutionalEmail` VARCHAR(191) NULL,
    `extraSettings` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `institution_settings_logoFileId_key`(`logoFileId`),
    UNIQUE INDEX `institution_settings_shieldFileId_key`(`shieldFileId`),
    UNIQUE INDEX `institution_settings_faviconFileId_key`(`faviconFileId`),
    UNIQUE INDEX `institution_settings_activeSemesterId_key`(`activeSemesterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `school_calendar_events` (
    `id` VARCHAR(191) NOT NULL,
    `semesterId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `type` ENUM('ACADEMIC', 'INSTITUTIONAL', 'HOLIDAY', 'DEADLINE', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `visibleToRoles` JSON NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `school_calendar_events_semesterId_idx`(`semesterId`),
    INDEX `school_calendar_events_startsAt_idx`(`startsAt`),
    INDEX `school_calendar_events_type_idx`(`type`),
    INDEX `school_calendar_events_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `tableName` VARCHAR(191) NULL,
    `recordId` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `browser` VARCHAR(191) NULL,
    `operatingSystem` VARCHAR(191) NULL,
    `result` VARCHAR(191) NOT NULL DEFAULT 'success',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_module_idx`(`module`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_groups` ADD CONSTRAINT `academic_groups_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_groups` ADD CONSTRAINT `academic_groups_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_groups` ADD CONSTRAINT `academic_groups_managerTeacherId_fkey` FOREIGN KEY (`managerTeacherId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignments` ADD CONSTRAINT `teaching_assignments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignments` ADD CONSTRAINT `teaching_assignments_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignments` ADD CONSTRAINT `teaching_assignments_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teaching_assignments` ADD CONSTRAINT `teaching_assignments_academicGroupId_fkey` FOREIGN KEY (`academicGroupId`) REFERENCES `academic_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_academicGroupId_fkey` FOREIGN KEY (`academicGroupId`) REFERENCES `academic_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_teachingAssignmentId_fkey` FOREIGN KEY (`teachingAssignmentId`) REFERENCES `teaching_assignments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_academicGroupId_fkey` FOREIGN KEY (`academicGroupId`) REFERENCES `academic_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `classes` ADD CONSTRAINT `classes_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `subjects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `file_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attachments` ADD CONSTRAINT `attachments_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_assets` ADD CONSTRAINT `file_assets_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grades` ADD CONSTRAINT `grades_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `corrections_requests` ADD CONSTRAINT `corrections_requests_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `institution_settings` ADD CONSTRAINT `institution_settings_activeSemesterId_fkey` FOREIGN KEY (`activeSemesterId`) REFERENCES `semesters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `school_calendar_events` ADD CONSTRAINT `school_calendar_events_semesterId_fkey` FOREIGN KEY (`semesterId`) REFERENCES `semesters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

