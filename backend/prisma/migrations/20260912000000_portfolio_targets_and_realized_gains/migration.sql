-- CreateTable
CREATE TABLE `portfolio_allocation_targets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `holdingType` ENUM('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'GOLD', 'FIXED_DEPOSIT') NOT NULL,
    `targetPct` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `portfolio_allocation_targets_userId_holdingType_key`(`userId`, `holdingType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `realized_gains` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` DECIMAL(18, 6) NOT NULL,
    `salePrice` DECIMAL(14, 4) NOT NULL,
    `avgCostBasis` DECIMAL(14, 4) NOT NULL,
    `realizedGain` DECIMAL(14, 4) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `holdingId` INTEGER NOT NULL,
    `transactionId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `realized_gains_transactionId_key`(`transactionId`),
    INDEX `realized_gains_userId_date_idx`(`userId`, `date`),
    INDEX `realized_gains_holdingId_idx`(`holdingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portfolio_allocation_targets` ADD CONSTRAINT `portfolio_allocation_targets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `realized_gains` ADD CONSTRAINT `realized_gains_holdingId_fkey` FOREIGN KEY (`holdingId`) REFERENCES `portfolio_holdings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `realized_gains` ADD CONSTRAINT `realized_gains_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `portfolio_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `realized_gains` ADD CONSTRAINT `realized_gains_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
