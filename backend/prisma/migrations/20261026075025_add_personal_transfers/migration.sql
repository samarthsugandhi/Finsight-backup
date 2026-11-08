-- AlterTable
ALTER TABLE `categories` MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- AlterTable
ALTER TABLE `review_queue_transactions` ADD COLUMN `destinationAccount` VARCHAR(191) NULL,
    ADD COLUMN `sourceAccount` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `destinationAccount` VARCHAR(191) NULL,
    ADD COLUMN `linkedTransactionId` INTEGER NULL,
    ADD COLUMN `sourceAccount` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INCOME', 'EXPENSE', 'TRANSFER') NOT NULL;

-- CreateIndex
CREATE INDEX `transactions_linkedTransactionId_idx` ON `transactions`(`linkedTransactionId`);

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_linkedTransactionId_fkey` FOREIGN KEY (`linkedTransactionId`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
