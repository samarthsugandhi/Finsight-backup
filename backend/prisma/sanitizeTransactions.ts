import { PrismaClient, TransactionType } from '@prisma/client';
import { computeTransactionHash } from '../src/utils/categorizationRules';

const prisma = new PrismaClient();

async function sanitizeDatabase() {
  console.log('🧹 Starting Database Sanitization & Idempotency Enforcement...\n');

  // =========================================================================
  // 1. SANITIZE TRANSACTIONS
  // =========================================================================
  console.log('1. Sanitizing `Transaction` ledger...');
  const allTransactions = await prisma.transaction.findMany({
    orderBy: { id: 'asc' },
  });

  const seenTxHashes = new Map<string, number>(); // hash -> id
  let txDuplicatesDeleted = 0;
  let txHashesUpdated = 0;

  for (const tx of allTransactions) {
    const computedHash = computeTransactionHash(
      tx.userId,
      tx.date,
      Number(tx.amount),
      tx.description || '',
      tx.type
    );

    if (seenTxHashes.has(computedHash)) {
      // Duplicate record found -> Delete
      const originalId = seenTxHashes.get(computedHash);
      console.log(
        `  - [DUPLICATE] Deleting Transaction #${tx.id} (matches original #${originalId}) | ${tx.description} | ${tx.amount} | ${tx.date.toISOString().slice(0, 10)}`
      );
      await prisma.transaction.delete({ where: { id: tx.id } });
      txDuplicatesDeleted++;
      continue;
    }

    // Check if another record already has this hash in the database
    const existingInDb = await prisma.transaction.findFirst({
      where: { transactionHash: computedHash, id: { not: tx.id } },
    });

    if (existingInDb) {
      console.log(
        `  - [DUPLICATE] Deleting Transaction #${tx.id} (collides with #${existingInDb.id} which already holds this hash)`
      );
      await prisma.transaction.delete({ where: { id: tx.id } });
      txDuplicatesDeleted++;
      seenTxHashes.set(computedHash, existingInDb.id);
      continue;
    }

    seenTxHashes.set(computedHash, tx.id);
    if (tx.transactionHash !== computedHash) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { transactionHash: computedHash },
      });
      txHashesUpdated++;
    }
  }

  console.log(
    `✓ Processed ${allTransactions.length} transactions: ${txDuplicatesDeleted} duplicates deleted, ${txHashesUpdated} hashes backfilled/updated.`
  );

  // =========================================================================
  // 2. SANITIZE REVIEW QUEUE
  // =========================================================================
  console.log('\n2. Sanitizing `ReviewQueueTransaction`...');
  const allQueueItems = await prisma.reviewQueueTransaction.findMany({
    orderBy: { id: 'asc' },
  });

  const seenQueueHashes = new Map<string, number>();
  let queueDuplicatesDeleted = 0;
  let queueCrossDuplicatesDeleted = 0;
  let queueHashesUpdated = 0;

  for (const item of allQueueItems) {
    const computedHash = computeTransactionHash(
      item.userId,
      item.date,
      Number(item.amount),
      item.description || '',
      item.type
    );

    if (seenTxHashes.has(computedHash)) {
      // Cross-table duplicate: Already categorized in Transaction table!
      console.log(
        `  - [CROSS-DUPLICATE] Deleting ReviewQueue #${item.id} (already recorded in Transaction ledger #${seenTxHashes.get(computedHash)})`
      );
      await prisma.reviewQueueTransaction.delete({ where: { id: item.id } });
      queueCrossDuplicatesDeleted++;
      continue;
    }

    if (seenQueueHashes.has(computedHash)) {
      // Intra-queue duplicate
      const originalId = seenQueueHashes.get(computedHash);
      console.log(
        `  - [QUEUE DUPLICATE] Deleting ReviewQueue #${item.id} (matches queue item #${originalId})`
      );
      await prisma.reviewQueueTransaction.delete({ where: { id: item.id } });
      queueDuplicatesDeleted++;
      continue;
    }

    // Check if another queue item already holds this hash
    const existingQueueInDb = await prisma.reviewQueueTransaction.findFirst({
      where: { transactionHash: computedHash, id: { not: item.id } },
    });

    if (existingQueueInDb) {
      console.log(
        `  - [QUEUE DUPLICATE] Deleting ReviewQueue #${item.id} (collides with #${existingQueueInDb.id} which already holds this hash)`
      );
      await prisma.reviewQueueTransaction.delete({ where: { id: item.id } });
      queueDuplicatesDeleted++;
      seenQueueHashes.set(computedHash, existingQueueInDb.id);
      continue;
    }

    seenQueueHashes.set(computedHash, item.id);
    if (item.transactionHash !== computedHash) {
      await prisma.reviewQueueTransaction.update({
        where: { id: item.id },
        data: { transactionHash: computedHash },
      });
      queueHashesUpdated++;
    }
  }

  console.log(
    `✓ Processed ${allQueueItems.length} review queue records: ${queueDuplicatesDeleted} queue duplicates deleted, ${queueCrossDuplicatesDeleted} cross-table duplicates removed, ${queueHashesUpdated} hashes backfilled/updated.`
  );

  // =========================================================================
  // 3. RE-SYNCHRONIZE USER TOTALS (totalIncome & totalExpense)
  // =========================================================================
  console.log('\n3. Re-synchronizing User ledger totals...');
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

    const totalIncome = incomeAgg._sum.amount ?? 0;
    const totalExpense = expenseAgg._sum.amount ?? 0;

    await prisma.user.update({
      where: { id: user.id },
      data: { totalIncome, totalExpense },
    });

    console.log(
      `  - User #${user.id} (${user.email}): totalIncome = ${Number(totalIncome).toFixed(2)}, totalExpense = ${Number(totalExpense).toFixed(2)}`
    );
  }

  // =========================================================================
  // 4. FINAL INTEGRITY VERIFICATION
  // =========================================================================
  const [finalTxCount, finalTxNull, finalRqCount, finalRqNull] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.count({ where: { transactionHash: null } }),
    prisma.reviewQueueTransaction.count(),
    prisma.reviewQueueTransaction.count({ where: { transactionHash: null } }),
  ]);

  console.log('\n--- Final Database State ---');
  console.log(`Transactions: ${finalTxCount} (Null hashes: ${finalTxNull})`);
  console.log(`Review Queue: ${finalRqCount} (Null hashes: ${finalRqNull})`);

  if (finalTxNull === 0 && finalRqNull === 0) {
    console.log('\n🎉 Database sanitization successfully completed! 100% data integrity & idempotency enforced.');
  } else {
    console.warn('\n⚠️ Warning: Some records still have null hashes.');
  }
}

sanitizeDatabase()
  .catch((err) => {
    console.error('❌ Sanitization failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
