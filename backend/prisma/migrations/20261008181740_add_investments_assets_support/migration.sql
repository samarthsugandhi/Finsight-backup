-- AlterTable
ALTER TABLE `market_price_cache` MODIFY `assetType` ENUM('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'GOLD', 'FIXED_DEPOSIT', 'BOND', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `portfolio_allocation_targets` MODIFY `holdingType` ENUM('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'GOLD', 'FIXED_DEPOSIT', 'BOND', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `portfolio_holdings` ADD COLUMN `importHash` VARCHAR(191) NULL,
    ADD COLUMN `manualCurrentValue` DECIMAL(14, 2) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `source` VARCHAR(191) NULL DEFAULT 'MANUAL',
    ADD COLUMN `subType` VARCHAR(191) NULL,
    MODIFY `type` ENUM('STOCK', 'MUTUAL_FUND', 'CRYPTO', 'GOLD', 'FIXED_DEPOSIT', 'BOND', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `portfolio_transactions` ADD COLUMN `importHash` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `portfolio_transactions_importHash_idx` ON `portfolio_transactions`(`importHash`);
