-- DropForeignKey
ALTER TABLE `wbs_items` DROP FOREIGN KEY `wbs_items_projectId_fkey`;

-- DropIndex
DROP INDEX `wbs_items_projectId_code_key` ON `wbs_items`;

-- AlterTable
ALTER TABLE `milestones` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `schedule_baselines` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `rejectedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectedBy` INTEGER NULL,
    ADD COLUMN `rejectionReason` VARCHAR(191) NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NULL,
    ADD COLUMN `submittedBy` INTEGER NULL,
    MODIFY `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `wbs_items` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX `schedule_baselines_status_idx` ON `schedule_baselines`(`status`);

