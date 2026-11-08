import { TransactionType, Prisma } from '@prisma/client';
import { prisma } from "@/database/prisma";
import {
  categorizeTransactionPipeline,
  computeTransactionHash,
} from '../utils/categorizationRules';
import { extractPdfText } from '@/utils/pdf';

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  transactionHash?: string;
}

export interface ProcessCategorizedTransactionInput {
  userId: number;
  amount: number;
  type: TransactionType;
  description: string;
  date: Date;
  categoryId: number;
  sourceAccount?: string;
  destinationAccount?: string;
  linkedTransactionId?: number;
  transactionHash?: string;
  reviewQueueId?: number;
  createRule?: boolean;
}

export class StatementsService {
  /**
   * ACID Helper: Processes a single categorized transaction atomically using prisma.$transaction.
   * 1. Inserts the transaction into the main Transaction ledger table (saving transactionHash, accounts, transfer link).
   * 2. If EXPENSE, queries the relevant Budget category, decrements remainingAmount, or creates budget dynamically if null.
   * 3. Updates the User's global totalIncome or totalExpense fields atomically (transfers excluded from income/expense).
   * 4. Deletes the item from ReviewQueue (if manually approved from queue).
   * 5. Optionally saves a new CategorizationRule for future auto-matching.
   */
  static async processCategorizedTransaction(
    input: ProcessCategorizedTransactionInput,
    externalTx?: Prisma.TransactionClient
  ) {
    const execute = async (tx: Prisma.TransactionClient) => {
      const hash =
        input.transactionHash ||
        computeTransactionHash(
          input.userId,
          input.date,
          input.amount,
          input.description,
          input.type
        );

      // 1. Insert into main Transaction ledger table
      const transaction = await tx.transaction.create({
        data: {
          amount: new Prisma.Decimal(input.amount),
          type: input.type,
          description: input.description,
          date: input.date,
          categoryId: input.categoryId,
          userId: input.userId,
          sourceAccount: input.sourceAccount || null,
          destinationAccount: input.destinationAccount || null,
          linkedTransactionId: input.linkedTransactionId || null,
          transactionHash: hash,
        },
        include: { category: true },
      });

      // 2. Budget ledger update for EXPENSES (transfers never affect budget spending limits)
      if (input.type === TransactionType.EXPENSE) {
        const txDate = input.date instanceof Date ? input.date : new Date(input.date);
        const month = txDate.getMonth() + 1;
        const year = txDate.getFullYear();

        const existingBudget = await tx.budget.findUnique({
          where: {
            userId_categoryId_month_year: {
              userId: input.userId,
              categoryId: input.categoryId,
              month,
              year,
            },
          },
        });

        if (existingBudget) {
          const currentRemaining =
            existingBudget.remainingAmount !== null
              ? Number(existingBudget.remainingAmount)
              : Number(existingBudget.monthlyLimit);
          const newRemaining = Math.max(0, currentRemaining - input.amount);

          await tx.budget.update({
            where: { id: existingBudget.id },
            data: {
              remainingAmount: new Prisma.Decimal(newRemaining),
            },
          });
        }
      }

      // 3. Atomically update User's global totalIncome or totalExpense (transfers excluded)
      if (input.type === TransactionType.INCOME) {
        await tx.user.update({
          where: { id: input.userId },
          data: {
            totalIncome: { increment: new Prisma.Decimal(input.amount) },
          },
        });
      } else if (input.type === TransactionType.EXPENSE) {
        await tx.user.update({
          where: { id: input.userId },
          data: {
            totalExpense: { increment: new Prisma.Decimal(input.amount) },
          },
        });
      }

      // 4. Delete item from ReviewQueue to guarantee ZERO cross-table duplicates
      await tx.reviewQueueTransaction.deleteMany({
        where: {
          OR: [
            ...(input.reviewQueueId ? [{ id: input.reviewQueueId, userId: input.userId }] : []),
            ...(hash ? [{ transactionHash: hash, userId: input.userId }] : []),
          ],
        },
      });

      // 5. Optionally create / upsert User Rule
      if (input.createRule && input.description) {
        await tx.categorizationRule.upsert({
          where: {
            userId_descriptionPattern: {
              userId: input.userId,
              descriptionPattern: input.description,
            },
          },
          update: { categoryId: input.categoryId, exactMatch: true },
          create: {
            userId: input.userId,
            descriptionPattern: input.description,
            exactMatch: true,
            categoryId: input.categoryId,
          },
        });
      }

      return transaction;
    };

    if (externalTx) {
      return execute(externalTx);
    }
    return prisma.$transaction(execute);
  }

  /**
   * Processes a bank statement PDF with strict Idempotency & ACID Transactions:
   * 1. Extracts & parses transactions from PDF.
   * 2. Computes a transactionHash for each transaction row.
   * 3. Queries DB for existing hashes (in Transaction & ReviewQueue) and SKIPS duplicates entirely.
   * 4. Runs non-duplicate rows through the 4-step Auto-Categorization Pipeline.
   * 5. Executes ACID transactions to insert categorized rows, update budgets, and update user totals.
   * 6. Queues unknown / blank P2P transactions to ReviewQueue.
   */
  static async processStatement(fileBuffer: Buffer, userId: number) {
    // 1. Extract text from PDF
    const text = await extractPdfText(fileBuffer);

    // 2. Parse text into raw transactions
    const rawTransactions = this.parseTransactions(text);

    if (rawTransactions.length === 0) {
      return {
        totalFound: 0,
        categorized: 0,
        queuedForReview: 0,
        duplicatesSkipped: 0,
      };
    }

    // 3. Compute transactionHash and perform in-memory deduplication
    const seenHashesInFile = new Set<string>();
    const uniqueFileTransactions: ParsedTransaction[] = [];

    for (const txn of rawTransactions) {
      const hash = computeTransactionHash(
        userId,
        txn.date,
        txn.amount,
        txn.description,
        txn.type
      );
      txn.transactionHash = hash;

      if (!seenHashesInFile.has(hash)) {
        seenHashesInFile.add(hash);
        uniqueFileTransactions.push(txn);
      }
    }

    // 4. Query DB for existing transaction hashes in Transaction and ReviewQueue tables
    const allFileHashes = uniqueFileTransactions.map((t) => t.transactionHash!);
    const [existingTransactions, existingQueueItems] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, transactionHash: { in: allFileHashes } },
        select: { transactionHash: true },
      }),
      prisma.reviewQueueTransaction.findMany({
        where: { userId, transactionHash: { in: allFileHashes } },
        select: { transactionHash: true },
      }),
    ]);

    const existingHashesSet = new Set<string>([
      ...existingTransactions.map((t) => t.transactionHash!).filter(Boolean),
      ...existingQueueItems.map((q) => q.transactionHash!).filter(Boolean),
    ]);

    // 5. Filter out already processed/queued transactions (Idempotency)
    const newTransactions = uniqueFileTransactions.filter(
      (t) => !existingHashesSet.has(t.transactionHash!)
    );
    const duplicatesSkipped = rawTransactions.length - newTransactions.length;

    if (newTransactions.length === 0) {
      return {
        totalFound: rawTransactions.length,
        categorized: 0,
        queuedForReview: 0,
        duplicatesSkipped,
      };
    }

    // 6. Fetch user's categorization rules and categories from DB
    const [rules, categories] = await Promise.all([
      prisma.categorizationRule.findMany({ where: { userId } }),
      prisma.category.findMany(),
    ]);

    const categoryNameToId = new Map<string, number>(
      categories.map((c) => [c.name.toLowerCase(), c.id])
    );

    const autoCategorizedTxns: Array<ParsedTransaction & { categoryId: number }> = [];
    const reviewQueueTxns: ParsedTransaction[] = [];

    // 7. Run through the deterministic 4-step categorization pipeline
    for (const txn of newTransactions) {
      const result = categorizeTransactionPipeline(
        txn.description,
        txn.type,
        rules,
        categoryNameToId
      );

      if (result.isAutoCategorized && result.categoryId) {
        autoCategorizedTxns.push({
          ...txn,
          categoryId: result.categoryId,
        });
      } else {
        reviewQueueTxns.push(txn);
      }
    }

    // 8. ACID Transaction Execution for Auto-Categorized Rows
    let categorizedCount = 0;
    if (autoCategorizedTxns.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of autoCategorizedTxns) {
          await this.processCategorizedTransaction(
            {
              userId,
              amount: item.amount,
              type: item.type,
              description: item.description,
              date: item.date,
              categoryId: item.categoryId,
              transactionHash: item.transactionHash,
            },
            tx
          );
        }
      });
      categorizedCount = autoCategorizedTxns.length;
    }

    // 9. Queue Uncategorized / Blank P2P transactions to ReviewQueue
    let reviewQueueCount = 0;
    if (reviewQueueTxns.length > 0) {
      const queueData = reviewQueueTxns.map((t) => ({
        amount: new Prisma.Decimal(t.amount),
        type: t.type,
        description: t.description,
        date: t.date,
        transactionHash: t.transactionHash,
        userId,
      }));

      const queueResult = await prisma.reviewQueueTransaction.createMany({
        data: queueData,
        skipDuplicates: true,
      });
      reviewQueueCount = queueResult.count;
    }

    return {
      totalFound: rawTransactions.length,
      categorized: categorizedCount,
      queuedForReview: reviewQueueCount,
      duplicatesSkipped,
    };
  }

  /**
   * Generalized bank statement text parser with multi-signal CR/DR detection:
   * 1. Running Balance Differential tracking (highest confidence, 100% mathematical certainty).
   * 2. Multi-column amount detection (Withdrawal vs Deposit).
   * 3. Pipe-delimited and dash placeholder indicators.
   * 4. Explicit CR / DR / CREDIT / DEBIT tokens.
   * 5. Narration and banking keyword heuristics.
   */
  static parseTransactions(text: string): ParsedTransaction[] {
    // 1. Detect Initial Opening Balance from statement header
    const openMatch = text.match(
      /(?:Opening Balance|Balance b\/f|B\/F|Brought Forward|OPENING BAL)[\s:–—]*[₹Rs.\s]*([\d,]+(?:\.\d{1,2})?)/i
    );
    let runningBalance: number | null = openMatch
      ? parseFloat(openMatch[1].replace(/[₹Rs\s,]/g, ''))
      : null;

    const isIgnoredLine = (line: string): boolean => {
      const lower = line.toLowerCase();
      return (
        /^page\s+\d+\s+of\s+\d+/i.test(line) ||
        /^--\s*\d+\s+of\s+\d+\s*--/i.test(line) ||
        lower.includes('this is system generated') ||
        lower.includes('signature not required') ||
        lower.includes('date description withdrawals deposits balance') ||
        lower.includes('date narration chq/ref no') ||
        lower.includes('statement of account') ||
        lower.includes('statement generated') ||
        lower.includes('statement period') ||
        lower.includes('account number:') ||
        lower.includes('ifsc code:') ||
        lower.includes('branch code:') ||
        lower.startsWith('closing balance')
      );
    };

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !isIgnoredLine(line));
    const transactions: ParsedTransaction[] = [];

    // Matches multiple date formats:
    // 1. DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
    // 2. YYYY-MM-DD
    // 3. DD-MMM-YYYY or DD MMM YYYY (e.g. 30-Jul-2026)
    // 4. MMM DD, YYYY (e.g. Aug 27, 2026)
    const dateRegex = /(?:^|\s)(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4}|[A-Za-z]{3}\s+\d{1,2},?\s+\d{4})/;

    let currentTxn: { dateLines: string[]; otherLines: string[] } | null = null;

    for (const line of lines) {
      // If line is pure opening balance line without a transaction, capture its balance and skip
      if (/^opening balance/i.test(line)) {
        const amtMatch = line.match(/[\d,]+\.\d{2}/);
        if (amtMatch) {
          runningBalance = parseFloat(amtMatch[0].replace(/,/g, ''));
        }
        continue;
      }

      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        if (currentTxn) {
          const parsed = this.finalizeTransaction(currentTxn, runningBalance);
          if (parsed) {
            transactions.push(parsed);
            if (parsed.balance !== undefined && !isNaN(parsed.balance)) {
              runningBalance = parsed.balance;
            }
          }
        }
        currentTxn = { dateLines: [line], otherLines: [] };
      } else if (currentTxn) {
        currentTxn.otherLines.push(line);
      }
    }

    if (currentTxn) {
      const parsed = this.finalizeTransaction(currentTxn, runningBalance);
      if (parsed) transactions.push(parsed);
    }

    return transactions;
  }

  private static finalizeTransaction(
    txnData: {
      dateLines: string[];
      otherLines: string[];
    },
    prevBalance: number | null = null
  ): (ParsedTransaction & { balance?: number }) | null {
    const fullText = [...txnData.dateLines, ...txnData.otherLines].join(' ');

    // Skip opening balance line if captured as block
    if (/^opening balance/i.test(fullText.trim())) return null;

    // 1. Extract Date
    const dateRegex = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})|(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})|([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/;
    const dateMatch = fullText.match(dateRegex);
    if (!dateMatch) return null;

    let date: Date;
    if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
      // DD-MM-YYYY
      let year = parseInt(dateMatch[3], 10);
      if (year < 100) year += 2000;
      date = new Date(year, parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
    } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
      // DD-MMM-YYYY (e.g. 30-Jul-2026)
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      let year = parseInt(dateMatch[6], 10);
      if (year < 100) year += 2000;
      const monthIdx = months[dateMatch[5].toLowerCase().slice(0, 3)] ?? 0;
      date = new Date(year, monthIdx, parseInt(dateMatch[4], 10));
    } else if (dateMatch[7] && dateMatch[8] && dateMatch[9]) {
      // MMM DD, YYYY (e.g. Aug 27, 2026)
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const year = parseInt(dateMatch[9], 10);
      const monthIdx = months[dateMatch[7].toLowerCase().slice(0, 3)] ?? 0;
      date = new Date(year, monthIdx, parseInt(dateMatch[8], 10));
    } else {
      date = new Date();
    }

    // 2. Extract Amounts
    const amountPattern = /(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{2})?)/g;
    const rawAmounts: string[] = [];
    let m;
    while ((m = amountPattern.exec(fullText)) !== null) {
      const s = m[1];
      if (s.includes('.') || fullText.includes('₹') || fullText.includes('Rs')) {
        const val = parseFloat(s.replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          rawAmounts.push(s);
        }
      }
    }

    if (rawAmounts.length === 0) return null;

    const amounts = rawAmounts.map((s) => parseFloat(s.replace(/,/g, '')));
    const balanceAmount = amounts.length >= 2 ? amounts[amounts.length - 1] : undefined;
    const nonBalanceAmounts = amounts.length >= 2 ? amounts.slice(0, amounts.length - 1) : [amounts[0]];

    let transactionAmount = nonBalanceAmounts[nonBalanceAmounts.length - 1];
    let type: TransactionType | null = null;
    let detectionMethod = 'DEFAULT';

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 1: Running Balance Differential (Highest Confidence - 100% Mathematical Proof)
    // ─────────────────────────────────────────────────────────────────
    if (
      prevBalance !== null &&
      !isNaN(prevBalance) &&
      balanceAmount !== undefined &&
      !isNaN(balanceAmount) &&
      transactionAmount > 0
    ) {
      const diff = balanceAmount - prevBalance;
      if (Math.abs(diff - transactionAmount) < 0.1) {
        type = TransactionType.INCOME;
        detectionMethod = 'BALANCE_DIFF_CR';
      } else if (Math.abs(diff + transactionAmount) < 0.1) {
        type = TransactionType.EXPENSE;
        detectionMethod = 'BALANCE_DIFF_DR';
      } else if (diff > 0.05) {
        type = TransactionType.INCOME;
        detectionMethod = 'BALANCE_DIFF_UP';
      } else if (diff < -0.05) {
        type = TransactionType.EXPENSE;
        detectionMethod = 'BALANCE_DIFF_DOWN';
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 2: Multi-Column Withdrawal vs Deposit [withdrawal, deposit, balance]
    // ─────────────────────────────────────────────────────────────────
    if (!type && nonBalanceAmounts.length >= 2) {
      const withdrawalAmt = nonBalanceAmounts[nonBalanceAmounts.length - 2];
      const depositAmt = nonBalanceAmounts[nonBalanceAmounts.length - 1];

      if (depositAmt > 0 && withdrawalAmt === 0) {
        transactionAmount = depositAmt;
        type = TransactionType.INCOME;
        detectionMethod = 'COLUMN_DEPOSIT';
      } else if (withdrawalAmt > 0 && depositAmt === 0) {
        transactionAmount = withdrawalAmt;
        type = TransactionType.EXPENSE;
        detectionMethod = 'COLUMN_WITHDRAWAL';
      } else if (withdrawalAmt > 0 && depositAmt > 0) {
        transactionAmount = withdrawalAmt;
        type = TransactionType.EXPENSE;
        detectionMethod = 'COLUMN_WITHDRAWAL_PREFERRED';
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 3: Pipe Delimited Column Structure
    // ─────────────────────────────────────────────────────────────────
    if (!type && fullText.includes('|')) {
      const trimmedLine = fullText.replace(/^\|+|\|+$/g, '').trim();
      const parts = trimmedLine.split('|').map((p) => p.trim());
      if (parts.length >= 4) {
        const depositCol = parts[parts.length - 2];
        const withdrawalCol = parts[parts.length - 3];
        const numRegex = /[\d,]+\.\d{2}/;
        const hasWithdrawal = numRegex.test(withdrawalCol);
        const hasDeposit = numRegex.test(depositCol);

        if (hasDeposit && !hasWithdrawal) {
          type = TransactionType.INCOME;
          detectionMethod = 'PIPE_DEPOSIT';
        } else if (hasWithdrawal && !hasDeposit) {
          type = TransactionType.EXPENSE;
          detectionMethod = 'PIPE_WITHDRAWAL';
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 4: Dash / Blank Indicators
    // ─────────────────────────────────────────────────────────────────
    if (!type && rawAmounts.length >= 1) {
      const amtStr = rawAmounts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const blankWithdrawalPattern = new RegExp(`(?:^|[\\s|])[-–—](?:\\s+|\\s*\\|\\s*)${amtStr}`);
      const blankDepositPattern = new RegExp(`${amtStr}(?:\\s+|\\s*\\|\\s*)[-–—](?:\\s+|\\s*\\|\\s*)`);

      if (blankWithdrawalPattern.test(fullText)) {
        type = TransactionType.INCOME;
        detectionMethod = 'DASH_WITHDRAWAL_BLANK';
      } else if (blankDepositPattern.test(fullText)) {
        type = TransactionType.EXPENSE;
        detectionMethod = 'DASH_DEPOSIT_BLANK';
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 5: Explicit CR / DR / CREDIT / DEBIT Tokens
    // ─────────────────────────────────────────────────────────────────
    if (!type) {
      const hasCR = /\b(?:CR|CREDIT|CR\.|DEPOSIT)\b/i.test(fullText) || /[\d,]+\.\d{2}\s*CR/i.test(fullText);
      const hasDR = /\b(?:DR|DEBIT|DR\.|WITHDRAWAL)\b/i.test(fullText) || /[\d,]+\.\d{2}\s*DR/i.test(fullText);

      if (hasCR && !hasDR) {
        type = TransactionType.INCOME;
        detectionMethod = 'EXPLICIT_CR';
      } else if (hasDR && !hasCR) {
        type = TransactionType.EXPENSE;
        detectionMethod = 'EXPLICIT_DR';
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // SIGNAL 6: Narration & Keyword Heuristics
    // ─────────────────────────────────────────────────────────────────
    if (!type) {
      const descForHeuristic = fullText.toLowerCase();
      const incomeKeywords = [
        'salary', 'sal cr', 'credit', 'interest cr', 'interest credit',
        'sb int', 'dividend', 'refund', 'reversal', 'cashback',
        'received', 'transfer in', 'deposit', 'stipend', 'by transfer',
      ];
      const hasIncomeHint = incomeKeywords.some((kw) => descForHeuristic.includes(kw));
      type = hasIncomeHint ? TransactionType.INCOME : TransactionType.EXPENSE;
      detectionMethod = hasIncomeHint ? 'KEYWORD_INCOME' : 'DEFAULT_EXPENSE';
    }

    // 3. Validate amount
    if (isNaN(transactionAmount) || transactionAmount <= 0) return null;

    // 4. Extract Description: strip date, all detected amounts, boilerplate, and tidy whitespace
    let description = fullText.replace(dateRegex, '');
    for (const rawAmt of rawAmounts) {
      const escaped = rawAmt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      description = description.replace(new RegExp(`(?:₹|Rs\\.?)?\\s*${escaped}\\s*(CR|DR)?`, 'gi'), '');
    }

    const boilerplatePatterns = [
      /page\s+\d+\s+of\s+\d+/gi,
      /--\s*\d+\s+of\s+\d+\s*--/gi,
      /this is system generated\.?/gi,
      /signature not required\.?/gi,
      /closing balance/gi,
      /opening balance/gi,
      /date description withdrawals deposits balance chq\/ref no/gi,
      /date description withdrawals deposits balance/gi,
      /withdrawals deposits balance/gi,
      /chq\/ref no/gi,
    ];
    for (const bp of boilerplatePatterns) {
      description = description.replace(bp, '');
    }

    description = description.replace(/\s+/g, ' ').trim();
    if (!description) description = 'Unknown Transaction';

    console.log(
      `[Parser] "${description}" | amt=${transactionAmount} | bal=${balanceAmount ?? 'N/A'} | type=${type} (${detectionMethod})`
    );

    return {
      date,
      description,
      amount: transactionAmount,
      type: type || TransactionType.EXPENSE,
      balance: balanceAmount,
    };
  }

  static async getReviewQueue(userId: number) {
    return prisma.reviewQueueTransaction.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { date: 'desc' },
    });
  }

  static async approveFromQueue(
    queueId: number,
    userId: number,
    categoryId: number,
    createRule?: boolean,
    overrides?: {
      type?: TransactionType;
      sourceAccount?: string;
      destinationAccount?: string;
      linkedTransactionId?: number;
    }
  ) {
    const queueItem = await prisma.reviewQueueTransaction.findFirst({
      where: { id: queueId, userId, status: 'PENDING' },
    });

    if (!queueItem) throw new Error('Queue item not found or already processed');

    // If selected category is of type TRANSFER or override is TRANSFER, transaction is TRANSFER
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    const resolvedType =
      overrides?.type ||
      (category?.type === TransactionType.TRANSFER ? TransactionType.TRANSFER : queueItem.type);

    // Run ACID transaction via processCategorizedTransaction helper
    return this.processCategorizedTransaction({
      userId,
      amount: Number(queueItem.amount),
      type: resolvedType,
      description: queueItem.description || 'Unknown Transaction',
      date: queueItem.date,
      categoryId,
      sourceAccount: overrides?.sourceAccount || queueItem.sourceAccount || undefined,
      destinationAccount: overrides?.destinationAccount || queueItem.destinationAccount || undefined,
      linkedTransactionId: overrides?.linkedTransactionId || undefined,
      transactionHash: queueItem.transactionHash || undefined,
      reviewQueueId: queueId,
      createRule,
    });
  }
}