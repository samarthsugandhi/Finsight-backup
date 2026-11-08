import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

// Standard 18 categories
export const STANDARD_CATEGORIES = [
  // INCOME (7)
  { name: 'Salary', type: TransactionType.INCOME },
  { name: 'Pocket Money', type: TransactionType.INCOME },
  { name: 'Freelance', type: TransactionType.INCOME },
  { name: 'Investments', type: TransactionType.INCOME },
  { name: 'Refunds', type: TransactionType.INCOME },
  { name: 'Transfers - Received (P2P)', type: TransactionType.INCOME },
  { name: 'Miscellaneous Income', type: TransactionType.INCOME },

  // EXPENSE (11)
  { name: 'Bills & Utilities', type: TransactionType.EXPENSE },
  { name: 'Education & Stationery', type: TransactionType.EXPENSE },
  { name: 'Entertainment', type: TransactionType.EXPENSE },
  { name: 'Food & Dining', type: TransactionType.EXPENSE },
  { name: 'Groceries', type: TransactionType.EXPENSE },
  { name: 'Healthcare & Fitness', type: TransactionType.EXPENSE },
  { name: 'Rent & Housing', type: TransactionType.EXPENSE },
  { name: 'Shopping', type: TransactionType.EXPENSE },
  { name: 'Transfers - Sent (P2P)', type: TransactionType.EXPENSE },
  { name: 'Travel & Transport', type: TransactionType.EXPENSE },
  { name: 'Miscellaneous Expense', type: TransactionType.EXPENSE },
];

const MAPPING: Record<string, string> = {
  // Expense mappings
  food: 'Food & Dining',
  'food & dining': 'Food & Dining',
  groceries: 'Groceries',
  'groceries & household': 'Groceries',
  rent: 'Rent & Housing',
  'rent & housing': 'Rent & Housing',
  bills: 'Bills & Utilities',
  'utilities & bills': 'Bills & Utilities',
  'bills & utilities': 'Bills & Utilities',
  education: 'Education & Stationery',
  'education & stationery': 'Education & Stationery',
  transport: 'Travel & Transport',
  travel: 'Travel & Transport',
  'travel & transport': 'Travel & Transport',
  shopping: 'Shopping',
  'shopping & entertainment': 'Shopping',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare & Fitness',
  'healthcare & fitness': 'Healthcare & Fitness',
  'transfers - sent (p2p)': 'Transfers - Sent (P2P)',
  'other expense': 'Miscellaneous Expense',
  'miscellaneous expense': 'Miscellaneous Expense',

  // Income mappings
  salary: 'Salary',
  'pocket money': 'Pocket Money',
  'pocket money / allowance': 'Pocket Money',
  freelance: 'Freelance',
  business: 'Freelance',
  'freelance / business': 'Freelance',
  investment: 'Investments',
  investments: 'Investments',
  'investments / dividends': 'Investments',
  refunds: 'Refunds',
  refund: 'Refunds',
  'transfers - received (p2p)': 'Transfers - Received (P2P)',
  bonus: 'Miscellaneous Income',
  gift: 'Miscellaneous Income',
  interest: 'Miscellaneous Income',
  'other income': 'Miscellaneous Income',
  'miscellaneous income': 'Miscellaneous Income',
};

async function consolidate() {
  console.log('🔄 Starting Database Category Consolidation...\n');

  // 1. Ensure all 18 standard categories exist with correct type
  const targetCategoryMap = new Map<string, number>();

  for (const cat of STANDARD_CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { name: cat.name },
      update: { type: cat.type },
      create: { name: cat.name, type: cat.type },
    });
    targetCategoryMap.set(cat.name, record.id);
  }

  console.log(`✓ 18 Standard categories verified and initialized in DB.`);

  // 2. Fetch all existing categories
  const allCategories = await prisma.category.findMany();
  const standardNamesSet = new Set(STANDARD_CATEGORIES.map((c) => c.name));

  for (const cat of allCategories) {
    if (standardNamesSet.has(cat.name)) {
      continue; // Target category, don't migrate
    }

    const targetName = MAPPING[cat.name.toLowerCase()] || 'Miscellaneous Expense';
    const targetId = targetCategoryMap.get(targetName)!;

    console.log(`Migrating '${cat.name}' (id: ${cat.id}) → '${targetName}' (id: ${targetId})...`);

    // A. Migrate Transactions
    const txUpdate = await prisma.transaction.updateMany({
      where: { categoryId: cat.id },
      data: { categoryId: targetId },
    });
    if (txUpdate.count > 0) {
      console.log(`  - Reassigned ${txUpdate.count} transactions.`);
    }

    // B. Migrate Categorization Rules
    const rules = await prisma.categorizationRule.findMany({
      where: { categoryId: cat.id },
    });
    for (const rule of rules) {
      const existing = await prisma.categorizationRule.findUnique({
        where: {
          userId_descriptionPattern: {
            userId: rule.userId,
            descriptionPattern: rule.descriptionPattern,
          },
        },
      });
      if (existing && existing.id !== rule.id) {
        await prisma.categorizationRule.delete({ where: { id: rule.id } });
      } else {
        await prisma.categorizationRule.update({
          where: { id: rule.id },
          data: { categoryId: targetId },
        });
      }
    }

    // C. Migrate Budgets
    const budgets = await prisma.budget.findMany({
      where: { categoryId: cat.id },
    });
    for (const budget of budgets) {
      const existingTargetBudget = await prisma.budget.findUnique({
        where: {
          userId_categoryId_month_year: {
            userId: budget.userId,
            categoryId: targetId,
            month: budget.month,
            year: budget.year,
          },
        },
      });

      if (existingTargetBudget) {
        // Budget already exists for target category, delete the redundant old category budget
        await prisma.budget.delete({ where: { id: budget.id } });
      } else {
        await prisma.budget.update({
          where: { id: budget.id },
          data: { categoryId: targetId },
        });
      }
    }

    // D. Delete the old category
    await prisma.category.delete({
      where: { id: cat.id },
    });
    console.log(`  ✓ Old category '${cat.name}' deleted.`);
  }

  // 3. Final verification
  const finalCategories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  console.log('\n--- Final Consolidated Categories in Database ---');
  console.log(`Total count: ${finalCategories.length} (Expected: 18)`);
  for (const c of finalCategories) {
    console.log(`- [${c.type}] ${c.name}`);
  }

  if (finalCategories.length === 18) {
    console.log('\n🎉 Category consolidation completed with 100% data integrity!');
  } else {
    console.warn('\n⚠️ Warning: Category count is not 18.');
  }
}

consolidate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Consolidation failed:', err);
    process.exit(1);
  });
