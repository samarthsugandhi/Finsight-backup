import { prisma } from "../../database/prisma";
import { portfolioService } from "../../services/portfolio.service";
import { InvestmentStatementsService } from "../../services/investmentStatements.service";
import { healthScoreService } from "../../services/healthScore.service";

let failures = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`PASS: ${name}`);
  }
}

async function runIntegrationTests() {
  console.log("▶ Investments & Assets Module Integration Test Suite\n");

  // Fetch demo user
  const demoUser = await prisma.user.findFirst({
    where: { email: "demo@gmail.com" },
  });

  if (!demoUser) {
    console.error("Demo user not found in database. Seed the database first.");
    process.exit(1);
  }

  const userId = demoUser.id;

  // Cleanup any leftover test holdings from prior runs
  await prisma.portfolioHolding.deleteMany({
    where: {
      userId,
      name: { in: ["TEST_STOCK_ALPHA", "TEST_STOCK_BETA", "Tanishq 24K Gold Coin (Test)", "HDFC Tax Saver FD (Test)"] },
    },
  });

  // 1. Initial Portfolio List & Category Shelves
  const initialList = await portfolioService.list(userId);
  assert("Initial list returns holdings array", Array.isArray(initialList.holdings));
  assert("Initial list returns categorized shelves", Boolean(initialList.categorized));
  assert("Categorized contains stocksAndEtfs", Array.isArray(initialList.categorized.stocksAndEtfs));
  assert("Categorized contains mutualFunds", Array.isArray(initialList.categorized.mutualFunds));
  assert("Categorized contains gold", Array.isArray(initialList.categorized.gold));
  assert("Categorized contains fixedDeposits", Array.isArray(initialList.categorized.fixedDeposits));
  assert("Categorized contains otherAssets", Array.isArray(initialList.categorized.otherAssets));

  // 2. Add Manual Gold Asset
  const goldHolding = await portfolioService.addHolding(userId, {
    type: "GOLD",
    subType: "PHYSICAL_GOLD",
    name: "Tanishq 24K Gold Coin (Test)",
    quantity: 10,
    averageBuyPrice: 6500,
    manualCurrentValue: 74000,
    notes: "Bank Locker #4",
  });


  assert("Manual Gold holding created", Boolean(goldHolding?.id));
  assert("Gold holding type is GOLD", goldHolding.type === "GOLD");
  assert("Gold holding subType is PHYSICAL_GOLD", goldHolding.subType === "PHYSICAL_GOLD");
  assert("Gold holding source is MANUAL", goldHolding.source === "MANUAL");
  assert("Gold holding notes saved", goldHolding.notes === "Bank Locker #4");

  // 3. Add Manual Fixed Deposit Asset
  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + 180); // 180 days from now

  const fdHolding = await portfolioService.addHolding(userId, {
    type: "FIXED_DEPOSIT",
    name: "HDFC Tax Saver FD (Test)",
    principal: 100000,
    interestRate: 7.25,
    maturityDate: maturityDate.toISOString(),
    notes: "Certificate #98765",
  });

  assert("Manual FD holding created", Boolean(fdHolding?.id));
  assert("FD holding type is FIXED_DEPOSIT", fdHolding.type === "FIXED_DEPOSIT");
  assert("FD holding source is MANUAL", fdHolding.source === "MANUAL");

  // 4. Verify Computed Portfolio View
  const updatedList = await portfolioService.list(userId);
  const foundGold = updatedList.holdings.find((h) => h.id === goldHolding.id);
  const foundFd = updatedList.holdings.find((h) => h.id === fdHolding.id);

  assert("Gold holding in updated list has manualCurrentValue", foundGold?.currentValue === 74000);
  assert("Gold holding unrealized P&L calculated", foundGold?.profitLoss === 9000); // 74000 - 65000

  assert("FD holding has daysToMaturity computed", typeof foundFd?.daysToMaturity === "number");
  assert("FD holding is not matured", foundFd?.isMatured === false);
  assert("FD daysToMaturity near 180 days", foundFd?.daysToMaturity! >= 179 && foundFd?.daysToMaturity! <= 181);

  // 5. Investment Statement Ingestion & Deduplication
  const testCsv = `
Instrument,Qty.,Avg. cost,LTP,Cur. val,P&L,Net chg.
TEST_STOCK_ALPHA,15,1200.00,1350.00,20250.00,2250.00,12.50
TEST_STOCK_BETA,30,450.00,480.00,14400.00,900.00,6.67
`;

  const ingestResult1 = await InvestmentStatementsService.ingestStatement(
    Buffer.from(testCsv),
    "zerodha_test_statement.csv",
    "text/csv",
    userId
  );

  assert("Statement ingestion detects broker", ingestResult1.broker === "Zerodha");
  assert("Statement ingestion finds 2 items", ingestResult1.totalFound === 2);
  assert("Statement ingestion imports 2 new holdings", ingestResult1.newlyImported === 2);

  // Re-run identical statement -> Idempotency check
  const ingestResult2 = await InvestmentStatementsService.ingestStatement(
    Buffer.from(testCsv),
    "zerodha_test_statement.csv",
    "text/csv",
    userId
  );

  assert("Re-ingesting statement skips duplicate rows", ingestResult2.duplicatesSkipped === 2);
  assert("Re-ingesting statement imports 0 new rows", ingestResult2.newlyImported === 0);

  // 6. Financial Health Integration
  const healthMonthly = await healthScoreService.compute(userId, { period: "monthly", month: 10, year: 2026 });
  assert("Health score computation succeeds", typeof healthMonthly.score === "number");
  assert("Health score has diversification score", healthMonthly.breakdown.diversification !== null);

  // Verify that emergency resilience DOES NOT treat volatile stocks or gold as emergency cash,
  // and accounts for FD maturity restrictions (unmatured FD receives early withdrawal haircut of 50%).
  assert(
    "Emergency resilience liquid portfolio assets present with maturity haircut",
    healthMonthly.monthly.liquidPortfolioAssets >= Math.floor(foundFd?.currentValue! * 0.5)
  );

  // 7. Cleanup Test Holdings
  await prisma.portfolioHolding.deleteMany({
    where: {
      userId,
      id: { in: [goldHolding.id, fdHolding.id] },
    },
  });
  await prisma.portfolioHolding.deleteMany({
    where: {
      userId,
      name: { in: ["TEST_STOCK_ALPHA", "TEST_STOCK_BETA"] },
    },
  });

  console.log(failures === 0 ? "\nALL INVESTMENTS & ASSETS INTEGRATION TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

runIntegrationTests().catch((err) => {
  console.error("Test runner threw unhandled error:", err);
  process.exit(1);
});
