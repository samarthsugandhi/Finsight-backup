-- CreateTable
CREATE TABLE `portfolio_value_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `snapshotDate` DATE NOT NULL,
    `totalValue` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `portfolio_value_snapshots_userId_snapshotDate_key`(`userId`, `snapshotDate`),
    INDEX `portfolio_value_snapshots_userId_snapshotDate_idx`(`userId`, `snapshotDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portfolio_value_snapshots` ADD CONSTRAINT `portfolio_value_snapshots_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
