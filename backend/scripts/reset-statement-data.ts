/**
 * reset-statement-data.ts
 * 
 * One-time cleanup script: deletes ALL parsed statement transactions
 * and review queue items for a specific user so they can re-upload their
 * PDF with the corrected CR/DR balance-differential parser.
 *
 * Usage:
 *   npx tsx scripts/reset-statement-data.ts [userId]
 *   npx tsx scripts/reset-statement-data.ts          (defaults to userId=1)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userIdArg = process.argv[2];
  const userId = userIdArg ? parseInt(userIdArg, 10) : 1;

  if (isNaN(userId)) {
    console.error('Invalid userId argument.');
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user ID: ${userId}...`);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`❌ User with ID ${userId} not found.`);
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.email}`);

  const txnCount = await prisma.transaction.count({ where: { userId } });
  const incomeCount = await prisma.transaction.count({ where: { userId, type: 'INCOME' } });
  const expenseCount = await prisma.transaction.count({ where: { userId, type: 'EXPENSE' } });
  const queueCount = await prisma.reviewQueueTransaction.count({ where: { userId } });

  console.log(`\n📊 Current state:`);
  console.log(`   Transactions: ${txnCount} (INCOME: ${incomeCount}, EXPENSE: ${expenseCount})`);
  console.log(`   Review Queue: ${queueCount}`);

  console.log('\n🗑️  Deleting review queue items...');
  const deletedQueue = await prisma.reviewQueueTransaction.deleteMany({ where: { userId } });
  console.log(`   ✅ Deleted ${deletedQueue.count} queue items`);

  console.log('🗑️  Deleting transactions...');
  const deletedTxns = await prisma.transaction.deleteMany({ where: { userId } });
  console.log(`   ✅ Deleted ${deletedTxns.count} transactions`);

  console.log('🔄  Resetting totals to 0...');
  await prisma.user.update({
    where: { id: userId },
    data: { totalIncome: 0, totalExpense: 0 },
  });
  console.log('   ✅ Totals reset\n');
  console.log('🎉 Done! Re-upload your PDF at http://localhost:3000/dashboard/bank-statements\n');
}

main()
  .catch((e) => { console.error('Script error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
