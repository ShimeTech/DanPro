-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('DRAWING', 'RFI', 'SUBMITTAL', 'METHOD_STATEMENT', 'INSPECTION_REQUEST', 'CONTRACT', 'REPORT', 'OTHER') NOT NULL,
    `discipline` VARCHAR(191) NULL,
    `originator` VARCHAR(191) NULL,
    `zone` VARCHAR(191) NULL,
    `level` VARCHAR(191) NULL,
    `status` ENUM('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED', 'REJECTED') NOT NULL DEFAULT 'WIP',
    `currentRevision` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `documents_projectId_idx`(`projectId`),
    INDEX `documents_type_idx`(`type`),
    INDEX `documents_status_idx`(`status`),
    UNIQUE INDEX `documents_projectId_code_key`(`projectId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `revision` VARCHAR(191) NOT NULL,
    `status` ENUM('WIP', 'SHARED', 'PUBLISHED', 'ARCHIVED', 'REJECTED') NOT NULL DEFAULT 'WIP',
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedById` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `projectId` INTEGER NULL,

    INDEX `document_versions_documentId_idx`(`documentId`),
    INDEX `document_versions_uploadedById_idx`(`uploadedById`),
    UNIQUE INDEX `document_versions_documentId_revision_key`(`documentId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
