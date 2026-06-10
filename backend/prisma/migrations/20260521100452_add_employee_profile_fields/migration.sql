/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `approvals` DROP FOREIGN KEY `approvals_userId_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_userId_fkey`;

-- DropForeignKey
ALTER TABLE `company_users` DROP FOREIGN KEY `company_users_userId_fkey`;

-- DropForeignKey
ALTER TABLE `daily_reports` DROP FOREIGN KEY `daily_reports_preparedById_fkey`;

-- DropForeignKey
ALTER TABLE `document_versions` DROP FOREIGN KEY `document_versions_uploadedById_fkey`;

-- DropForeignKey
ALTER TABLE `inspections` DROP FOREIGN KEY `inspections_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `inspections` DROP FOREIGN KEY `inspections_inspectorId_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_transactions` DROP FOREIGN KEY `inventory_transactions_performedById_fkey`;

-- DropForeignKey
ALTER TABLE `ncr_reports` DROP FOREIGN KEY `ncr_reports_assignedToId_fkey`;

-- DropForeignKey
ALTER TABLE `ncr_reports` DROP FOREIGN KEY `ncr_reports_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_userId_fkey`;

-- DropForeignKey
ALTER TABLE `project_users` DROP FOREIGN KEY `project_users_userId_fkey`;

-- DropForeignKey
ALTER TABLE `purchase_orders` DROP FOREIGN KEY `purchase_orders_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `purchase_requests` DROP FOREIGN KEY `purchase_requests_requestedById_fkey`;

-- DropForeignKey
ALTER TABLE `rfis` DROP FOREIGN KEY `rfis_assignedToId_fkey`;

-- DropForeignKey
ALTER TABLE `rfis` DROP FOREIGN KEY `rfis_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `safety_incidents` DROP FOREIGN KEY `safety_incidents_reporterId_fkey`;

-- DropForeignKey
ALTER TABLE `safety_inspections` DROP FOREIGN KEY `safety_inspections_inspectorId_fkey`;

-- DropForeignKey
ALTER TABLE `submittals` DROP FOREIGN KEY `submittals_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `submittals` DROP FOREIGN KEY `submittals_reviewerId_fkey`;

-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_assignedToId_fkey`;

-- DropForeignKey
ALTER TABLE `toolbox_talks` DROP FOREIGN KEY `toolbox_talks_leaderId_fkey`;

-- DropIndex
DROP INDEX `inspections_createdById_fkey` ON `inspections`;

-- DropIndex
DROP INDEX `inspections_inspectorId_fkey` ON `inspections`;

-- DropIndex
DROP INDEX `inventory_transactions_performedById_fkey` ON `inventory_transactions`;

-- DropIndex
DROP INDEX `ncr_reports_assignedToId_fkey` ON `ncr_reports`;

-- DropIndex
DROP INDEX `ncr_reports_createdById_fkey` ON `ncr_reports`;

-- DropIndex
DROP INDEX `purchase_orders_createdById_fkey` ON `purchase_orders`;

-- DropIndex
DROP INDEX `purchase_requests_requestedById_fkey` ON `purchase_requests`;

-- DropIndex
DROP INDEX `safety_incidents_reporterId_fkey` ON `safety_incidents`;

-- DropIndex
DROP INDEX `safety_inspections_inspectorId_fkey` ON `safety_inspections`;

-- DropIndex
DROP INDEX `toolbox_talks_leaderId_fkey` ON `toolbox_talks`;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `employeeId` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `employmentType` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `emergencyName` VARCHAR(191) NULL,
    `emergencyPhone` VARCHAR(191) NULL,
    `educationLevel` VARCHAR(191) NULL,
    `fieldOfStudy` VARCHAR(191) NULL,
    `institution` VARCHAR(191) NULL,
    `graduationYear` INTEGER NULL,
    `yearsExperience` INTEGER NULL,
    `previousCompany` VARCHAR(191) NULL,
    `skills` JSON NULL,
    `certifications` JSON NULL,
    `languages` JSON NULL,
    `hireDate` DATETIME(3) NULL,
    `salary` DECIMAL(18, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_users` ADD CONSTRAINT `company_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_users` ADD CONSTRAINT `project_users_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_reports` ADD CONSTRAINT `daily_reports_preparedById_fkey` FOREIGN KEY (`preparedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfis` ADD CONSTRAINT `rfis_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rfis` ADD CONSTRAINT `rfis_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submittals` ADD CONSTRAINT `submittals_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submittals` ADD CONSTRAINT `submittals_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approvals` ADD CONSTRAINT `approvals_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ncr_reports` ADD CONSTRAINT `ncr_reports_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ncr_reports` ADD CONSTRAINT `ncr_reports_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_incidents` ADD CONSTRAINT `safety_incidents_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toolbox_talks` ADD CONSTRAINT `toolbox_talks_leaderId_fkey` FOREIGN KEY (`leaderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `safety_inspections` ADD CONSTRAINT `safety_inspections_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
