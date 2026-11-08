-- CreateTable
CREATE TABLE `portfolio_risk_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `selectedRiskLevel` VARCHAR(191) NOT NULL,
    `computedRiskScore` INTEGER NOT NULL,
    `computedRiskProfile` VARCHAR(191) NOT NULL,
    `riskTolerance` VARCHAR(191) NOT NULL,
    `riskCapacity` VARCHAR(191) NOT NULL,
    `investmentHorizon` VARCHAR(191) NOT NULL,
    `monthlyInvestableAmount` DECIMAL(12, 2) NULL,
    `hasEmergencySavings` VARCHAR(191) NOT NULL,
    `hasHighInterestDebt` BOOLEAN NOT NULL DEFAULT false,
    `experienceLevel` VARCHAR(191) NOT NULL,
    `answersJson` TEXT NULL,
    `plannedInvestmentAmount` DECIMAL(14, 2) NULL,
    `savedAllocationsJson` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `portfolio_risk_profiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `portfolio_risk_profiles` ADD CONSTRAINT `portfolio_risk_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
