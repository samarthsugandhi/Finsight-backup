-- CreateIndex
CREATE UNIQUE INDEX `portfolio_holdings_userId_importHash_key` ON `portfolio_holdings`(`userId`, `importHash`);

-- CreateIndex
CREATE UNIQUE INDEX `portfolio_transactions_userId_importHash_key` ON `portfolio_transactions`(`userId`, `importHash`);
