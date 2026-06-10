-- CreateTable
CREATE TABLE `schedule_baselines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `version` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'APPROVED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `schedule_baselines_projectId_idx`(`projectId`),
    UNIQUE INDEX `schedule_baselines_projectId_version_key`(`projectId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_baseline_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `baselineId` INTEGER NOT NULL,
    `taskId` INTEGER NOT NULL,
    `plannedStart` DATETIME(3) NULL,
    `plannedEnd` DATETIME(3) NULL,
    `durationDays` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `schedule_baseline_items_baselineId_idx`(`baselineId`),
    INDEX `schedule_baseline_items_taskId_idx`(`taskId`),
    UNIQUE INDEX `schedule_baseline_items_baselineId_taskId_key`(`baselineId`, `taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schedule_baselines` ADD CONSTRAINT `schedule_baselines_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_baseline_items` ADD CONSTRAINT `schedule_baseline_items_baselineId_fkey` FOREIGN KEY (`baselineId`) REFERENCES `schedule_baselines`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_baseline_items` ADD CONSTRAINT `schedule_baseline_items_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
