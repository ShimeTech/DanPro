-- CreateTable
CREATE TABLE `daily_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `reportDate` DATETIME(3) NOT NULL,
    `weather` VARCHAR(191) NULL,
    `manpowerCount` INTEGER NOT NULL DEFAULT 0,
    `equipmentUsed` TEXT NULL,
    `workCompleted` TEXT NULL,
    `materialReceived` TEXT NULL,
    `sitePhotos` JSON NULL,
    `issues` TEXT NULL,
    `delays` TEXT NULL,
    `remarks` TEXT NULL,
    `preparedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `daily_reports_projectId_idx`(`projectId`),
    INDEX `daily_reports_reportDate_idx`(`reportDate`),
    INDEX `daily_reports_preparedById_idx`(`preparedById`),
    UNIQUE INDEX `daily_reports_projectId_reportDate_key`(`projectId`, `reportDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_preparedById_fkey` FOREIGN KEY (`preparedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
