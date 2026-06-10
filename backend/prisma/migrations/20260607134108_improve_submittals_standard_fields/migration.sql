-- AlterTable
ALTER TABLE `submittals` ADD COLUMN `approvalDate` DATETIME(3) NULL,
    ADD COLUMN `comments` TEXT NULL,
    ADD COLUMN `rejectionReason` TEXT NULL,
    ADD COLUMN `reviewCycle` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `reviewDate` DATETIME(3) NULL,
    ADD COLUMN `reviewedById` INTEGER NULL,
    ADD COLUMN `specificationReference` VARCHAR(191) NULL,
    ADD COLUMN `submissionDate` DATETIME(3) NULL,
    ADD COLUMN `submittalNo` VARCHAR(191) NULL,
    ADD COLUMN `submittedById` INTEGER NULL;

-- CreateIndex
CREATE INDEX `submittals_submittedById_idx` ON `submittals`(`submittedById`);

-- CreateIndex
CREATE INDEX `submittals_reviewedById_idx` ON `submittals`(`reviewedById`);

-- AddForeignKey
ALTER TABLE `submittals` ADD CONSTRAINT `submittals_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submittals` ADD CONSTRAINT `submittals_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
