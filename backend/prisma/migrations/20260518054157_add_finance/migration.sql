-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `subtotal` DECIMAL(18, 2) NOT NULL,
    `taxAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `retentionAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `advanceDeduction` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(18, 2) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoices_projectId_idx`(`projectId`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_invoiceDate_idx`(`invoiceDate`),
    UNIQUE INDEX `invoices_projectId_code_key`(`projectId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `invoiceId` INTEGER NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('ADVANCE', 'PROGRESS', 'RETENTION', 'FINAL', 'OTHER') NOT NULL DEFAULT 'PROGRESS',
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(18, 2) NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `paidBy` VARCHAR(191) NULL,
    `paidTo` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_projectId_idx`(`projectId`),
    INDEX `payments_invoiceId_idx`(`invoiceId`),
    INDEX `payments_type_idx`(`type`),
    INDEX `payments_status_idx`(`status`),
    UNIQUE INDEX `payments_projectId_code_key`(`projectId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
