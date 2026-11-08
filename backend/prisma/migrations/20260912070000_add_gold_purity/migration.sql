-- AlterTable
ALTER TABLE `budgets` ADD COLUMN `remainingAmount` DECIMAL(12, 2) NULL,
    MODIFY `monthlyLimit` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `goals` MODIFY `targetAmount` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `portfolio_holdings` ADD COLUMN `purity` ENUM('24K', '22K', '18K', 'OTHER') NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `transactionHash` VARCHAR(191) NULL,
    MODIFY `amount` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `totalExpense` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `totalIncome` DECIMAL(14, 2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE `categorization_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descriptionPattern` VARCHAR(191) NOT NULL,
    `exactMatch` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    UNIQUE INDEX `categorization_rules_userId_descriptionPattern_key`(`userId`, `descriptionPattern`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review_queue_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(12, 2) NOT NULL,
    `type` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `description` VARCHAR(191) NULL,
    `transactionHash` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `review_queue_transactions_transactionHash_key`(`transactionHash`),
    INDEX `review_queue_transactions_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `transactions_transactionHash_key` ON `transactions`(`transactionHash`);

-- AddForeignKey
ALTER TABLE `categorization_rules` ADD CONSTRAINT `categorization_rules_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorization_rules` ADD CONSTRAINT `categorization_rules_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review_queue_transactions` ADD CONSTRAINT `review_queue_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

