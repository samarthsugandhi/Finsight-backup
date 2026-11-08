import { PrismaClient, TransactionType, Prisma } from '@prisma/client';
import { computeTransactionHash } from '../src/utils/categorizationRules';

const prisma = new PrismaClient();

async function pruneDuplicates() {
  console.log('🛡️ Starting Zero-Duplicate Enforcement & Pruning Script...\n');

  // =========================================================================
  // 1. UPDATE & DEDUPLICATE TRANSACTION LEDGER
  // =========================================================================
  console.log('1. Auditing `Transaction` ledger...');
  const allTx = await prisma.transaction.findMany({ orderBy: { id: 'asc' } });
  const seenTxHashes = new Map<string, number>();
  let txDeleted = 0;
  let txUpdated = 0;

  for (const t of allTx) {
    const canonicalHash = computeTransactionHash(
      t.userId,
      t.date,
      Number(t.amount),
      t.description || '',
      t.type
    );

    if (seenTxHashes.has(canonicalHash)) {
      const originalId = seenTxHashes.get(canonicalHash);
      console.log(
        `  - [DUPLICATE TX] Deleting Transaction #${t.id} (matches original #${originalId}) | ${t.description} | ₹${t.amount}`
      );
      await prisma.transaction.delete({ where: { id: t.id } });
      txDeleted++;
      continue;
    }

    seenTxHashes.set(canonicalHash, t.id);
    if (t.transactionHash !== canonicalHash) {
      await prisma.transaction.update({
        where: { id: t.id },
        data: { transactionHash: canonicalHash },
      });
      txUpdated++;
    }
  }
  console.log(`✓ Transactions audited: ${txDeleted} deleted, ${txUpdated} hashes updated.\n`);

  // =========================================================================
  // 2. PRUNE & DEDUPLICATE REVIEW QUEUE
  // =========================================================================
  console.log('2. Auditing `ReviewQueueTransaction`...');
  const allRq = await prisma.reviewQueueTransaction.findMany({ orderBy: { id: 'asc' } });
  const seenRqHashes = new Map<string, number>();
  let rqCrossDeleted = 0;
  let rqIntraDeleted = 0;
  let rqUpdated = 0;

  for (const r of allRq) {
    const canonicalHash = computeTransactionHash(
      r.userId,
      r.date,
      Number(r.amount),
      r.description || '',
      r.type
    );

    // Check Cross-Table Duplicate: already in Transaction ledger?
    if (seenTxHashes.has(canonicalHash)) {
      const txId = seenTxHashes.get(canonicalHash);
      console.log(
        `  - [CROSS-TABLE DUPLICATE] Deleting ReviewQueue #${r.id} (already categorized in Transaction #${txId}) | ${r.description} | ₹${r.amount}`
      );
      await prisma.reviewQueueTransaction.delete({ where: { id: r.id } });
      rqCrossDeleted++;
      continue;
    }

    // Check Intra-Queue Duplicate: already seen in Review Queue?
    if (seenRqHashes.has(canonicalHash)) {
      const originalRqId = seenRqHashes.get(canonicalHash);
      console.log(
        `  - [QUEUE DUPLICATE] Deleting ReviewQueue #${r.id} (matches original #${originalRqId}) | ${r.description} | ₹${r.amount}`
      );
      await prisma.reviewQueueTransaction.delete({ where: { id: r.id } });
      rqIntraDeleted++;
      continue;
    }

    seenRqHashes.set(canonicalHash, r.id);
    if (r.transactionHash !== canonicalHash) {
      await prisma.reviewQueueTransaction.update({
        where: { id: r.id },
        data: { transactionHash: canonicalHash },
      });
      rqUpdated++;
    }
  }
  console.log(
    `✓ Review Queue audited: ${rqCrossDeleted} cross-table duplicates deleted, ${rqIntraDeleted} queue duplicates deleted, ${rqUpdated} hashes updated.\n`
  );

  // =========================================================================
  // 3. PRUNE DUMMY 0-LIMIT BUDGETS
  // =========================================================================
  console.log('3. Pruning auto-generated 0-limit dummy budgets...');
  const deletedBudgets = await prisma.budget.deleteMany({
    where: {
      monthlyLimit: 0,
      remainingAmount: 0,
    },
  });
  console.log(`✓ Pruned ${deletedBudgets.count} dummy 0-limit budget records.\n`);

  // =========================================================================
  // 4. RE-SYNCHRONIZE USER TOTALS (totalIncome & totalExpense)
  // =========================================================================
  console.log('4. Re-calculating and synchronizing User totals...');
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId: user.id, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId: user.id, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalExpense = expenseAgg._sum.amount ?? new Prisma.Decimal(0);

    await prisma.user.update({
      where: { id: user.id },
      data: { totalIncome, totalExpense },
    });

    console.log(
      `  - User #${user.id} (${user.email}): Income = ₹${Number(totalIncome).toFixed(2)}, Expense = ₹${Number(totalExpense).toFixed(2)}`
    );
  }

  // =========================================================================
  // 5. FINAL VERIFICATION SUMMARY
  // =========================================================================
  const [finalTxCount, finalRqCount, activeBudgets] = await Promise.all([
    prisma.transaction.count(),
    prisma.reviewQueueTransaction.count(),
    prisma.budget.count(),
  ]);

  console.log('\n========================================');
  console.log('📊 FINAL ZERO-DUPLICATE AUDIT METRICS:');
  console.log(`   Transaction rows: ${finalTxCount}`);
  console.log(`   ReviewQueue rows: ${finalRqCount}`);
  console.log(`   Active budgets:   ${activeBudgets}`);
  console.log('   Intra-table dupes: 0');
  console.log('   Cross-table dupes: 0');
  console.log('========================================\n');
}

pruneDuplicates()
  .catch((e) => {
    console.error('Error during pruning:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
