import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TransactionType } from '@prisma/client';
import {
  matchKeyword,
  isP2POrUpi,
  categorizeTransactionPipeline,
  computeTransactionHash,
} from '../categorizationRules';
import { StatementsService } from '../../services/statements.service';

describe('Enterprise SaaS Categorization & Idempotency Engine', () => {
  const categoryNameToId = new Map<string, number>([
    ['food & dining', 1],
    ['groceries', 2],
    ['rent & housing', 3],
    ['bills & utilities', 4],
    ['education & stationery', 5],
    ['travel & transport', 6],
    ['shopping', 7],
    ['entertainment', 8],
    ['healthcare & fitness', 9],
    ['transfers - sent (p2p)', 10],
    ['miscellaneous expense', 11],
    ['salary', 12],
    ['pocket money', 13],
    ['freelance', 14],
    ['investments', 15],
    ['refunds', 16],
    ['transfers - received (p2p)', 17],
    ['miscellaneous income', 18],
    // Aliases
    ['food', 1],
    ['groceries & household', 2],
    ['rent', 3],
    ['utilities & bills', 4],
    ['education', 5],
    ['travel', 6],
    ['transport', 6],
    ['shopping & entertainment', 7],
    ['healthcare', 9],
    ['pocket money / allowance', 13],
    ['freelance / business', 14],
    ['investments / dividends', 15],
  ]);

  describe('1. Idempotency & Hash Generation', () => {
    it('generates identical hash for identical transaction data (Idempotency)', () => {
      const date = new Date('2026-08-01T10:00:00.000Z');
      const hash1 = computeTransactionHash(1, date, 450.5, 'Swiggy Bangalore', TransactionType.EXPENSE);
      const hash2 = computeTransactionHash(1, date, 450.5, '  SWIGGY bangalore  ', TransactionType.EXPENSE);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(typeof hash1, 'string');
      assert.strictEqual(hash1.length, 64);
    });

    it('generates identical hash for identical payments with differing UPI reference numbers or handles', () => {
      const date = new Date('2026-07-29T00:00:00.000Z');
      const hash1 = computeTransactionHash(
        1,
        date,
        150,
        'UPI:392313540561:sangamedu@axl( SANGAM GADDI):Pay',
        TransactionType.EXPENSE
      );
      const hash2 = computeTransactionHash(
        1,
        date,
        150,
        'UPI:664696950323:sangamedu@ybl( SANGAM GADDI):Pay',
        TransactionType.EXPENSE
      );
      assert.strictEqual(hash1, hash2, 'Both duplicate attempts must generate identical hash');
    });

    it('generates distinct hashes for differing amounts, users, dates, or types', () => {
      const date = new Date('2026-08-01');
      const hash1 = computeTransactionHash(1, date, 450, 'Swiggy', TransactionType.EXPENSE);
      const hash2 = computeTransactionHash(1, date, 500, 'Swiggy', TransactionType.EXPENSE);
      const hash3 = computeTransactionHash(2, date, 450, 'Swiggy', TransactionType.EXPENSE);
      assert.notStrictEqual(hash1, hash2);
      assert.notStrictEqual(hash1, hash3);
    });
  });

  describe('2. Comprehensive Keyword Match Dictionary', () => {
    it('categorizes specific food and grocery keywords', () => {
      assert.strictEqual(matchKeyword('DMART READY MUMBAI', TransactionType.EXPENSE), 'Groceries');
      assert.strictEqual(matchKeyword('Ganesh Vadapav Center', TransactionType.EXPENSE), 'Food & Dining');
      assert.strictEqual(matchKeyword('SWIGGY BANGALORE IN', TransactionType.EXPENSE), 'Food & Dining');
      assert.strictEqual(matchKeyword('Zomato Order #8932', TransactionType.EXPENSE), 'Food & Dining');
      assert.strictEqual(matchKeyword('Blinkit Groceries Order', TransactionType.EXPENSE), 'Groceries');
    });

    it('categorizes education keywords including book, coursera, udemy', () => {
      assert.strictEqual(matchKeyword('Crossword Book Store Bangalore', TransactionType.EXPENSE), 'Education & Stationery');
      assert.strictEqual(matchKeyword('Online Book Purchase', TransactionType.EXPENSE), 'Education & Stationery');
      assert.strictEqual(matchKeyword('Coursera Inc Course Sub', TransactionType.EXPENSE), 'Education & Stationery');
    });

    it('categorizes transport, entertainment, bills and income', () => {
      assert.strictEqual(matchKeyword('UBER RIDE INDIA', TransactionType.EXPENSE), 'Travel & Transport');
      assert.strictEqual(matchKeyword('NETFLIX MUMBAI', TransactionType.EXPENSE), 'Entertainment');
      assert.strictEqual(matchKeyword('BESCOM ELECTRICITY BILL', TransactionType.EXPENSE), 'Bills & Utilities');
      assert.strictEqual(matchKeyword('TECH CORP MONTHLY SALARY', TransactionType.INCOME), 'Salary');
    });
  });

  describe('3. P2P / Personal UPI Transfers & Edge Cases', () => {
    it('identifies P2P and personal narrative patterns', () => {
      assert.strictEqual(isP2POrUpi('Punith: food'), true);
      assert.strictEqual(isP2POrUpi('Punith - lunch'), true);
      assert.strictEqual(isP2POrUpi('Paid to Arun'), true);
      assert.strictEqual(isP2POrUpi('UPI/12345/arun@okhdfcbank/Arun food'), true);
      assert.strictEqual(isP2POrUpi('ATM CASH WITHDRAWAL'), false);
    });

    it('P2P Keyword Match: categorizes P2P transfer containing keyword (e.g., "Punith: food")', () => {
      const result = categorizeTransactionPipeline(
        'Punith: food',
        TransactionType.EXPENSE,
        [],
        categoryNameToId
      );
      assert.strictEqual(result.isAutoCategorized, true);
      assert.strictEqual(result.categoryId, 1); // Food & Dining
      assert.strictEqual(result.matchSource, 'KEYWORD');
    });

    it('P2P Blank Fallback: sends P2P transfer with NO keyword directly to Review Queue', () => {
      const result = categorizeTransactionPipeline(
        'Paid to Arun',
        TransactionType.EXPENSE,
        [],
        categoryNameToId
      );
      assert.strictEqual(result.isAutoCategorized, false);
      assert.strictEqual(result.matchSource, 'FALLBACK_REVIEW_QUEUE');
    });
  });

  describe('4. Vendor Match / Saved User Rules', () => {
    const userRules = [
      {
        id: 1,
        descriptionPattern: 'Paid to Arun',
        exactMatch: true,
        categoryId: 3, // Rent & Housing
      },
      {
        id: 2,
        descriptionPattern: 'Punith',
        exactMatch: false,
        categoryId: 8, // Healthcare & Fitness
      },
    ];

    it('matches exact user rule for P2P transaction', () => {
      const result = categorizeTransactionPipeline(
        'Paid to Arun',
        TransactionType.EXPENSE,
        userRules,
        categoryNameToId
      );
      assert.strictEqual(result.isAutoCategorized, true);
      assert.strictEqual(result.categoryId, 3); // Rent & Housing
      assert.strictEqual(result.matchSource, 'USER_RULE');
    });

    it('matches substring/pattern user rule for P2P transaction', () => {
      const result = categorizeTransactionPipeline(
        'UPI/998811/Transfer to Punith Consultation',
        TransactionType.EXPENSE,
        userRules,
        categoryNameToId
      );
      assert.strictEqual(result.isAutoCategorized, true);
      assert.strictEqual(result.categoryId, 8); // Healthcare & Fitness
      assert.strictEqual(result.matchSource, 'USER_RULE');
    });
  });

  describe('5. Column-Based PDF Extraction (Phase 2)', () => {
    it('identifies EXPENSE when monetary value is in Withdrawals and Deposits is blank/zero', () => {
      // 2 numbers before balance: 500.00 withdrawal, 0.00 deposit, 12,000.00 balance
      const text = '15/08/2026 UBER RIDE BANGALORE 500.00 0.00 12,000.00';
      const txns = StatementsService.parseTransactions(text);
      assert.strictEqual(txns.length, 1);
      assert.strictEqual(txns[0].amount, 500);
      assert.strictEqual(txns[0].type, TransactionType.EXPENSE);
      assert.match(txns[0].description, /UBER RIDE/);
    });

    it('identifies INCOME when Withdrawals is blank/zero and Deposits has monetary value', () => {
      // 2 numbers before balance: 0.00 withdrawal, 75,000.00 deposit, 87,000.00 balance
      const text = '01/08/2026 TECH CORP MONTHLY SALARY 0.00 75,000.00 87,000.00';
      const txns = StatementsService.parseTransactions(text);
      assert.strictEqual(txns.length, 1);
      assert.strictEqual(txns[0].amount, 75000);
      assert.strictEqual(txns[0].type, TransactionType.INCOME);
      assert.match(txns[0].description, /TECH CORP/);
    });

    it('identifies EXPENSE and INCOME with dash placeholders in columns', () => {
      // Dash in deposit column -> EXPENSE
      const debitText = '10/08/2026 SWIGGY FOOD ORDER 450.00 - 11,550.00';
      const debitTxns = StatementsService.parseTransactions(debitText);
      assert.strictEqual(debitTxns.length, 1);
      assert.strictEqual(debitTxns[0].amount, 450);
      assert.strictEqual(debitTxns[0].type, TransactionType.EXPENSE);

      // Dash in withdrawal column -> INCOME
      const creditText = '05/08/2026 FREELANCE CLIENT INVOICE - 25,000.00 36,550.00';
      const creditTxns = StatementsService.parseTransactions(creditText);
      assert.strictEqual(creditTxns.length, 1);
      assert.strictEqual(creditTxns[0].amount, 25000);
      assert.strictEqual(creditTxns[0].type, TransactionType.INCOME);
    });

    it('identifies EXPENSE and INCOME with pipe-delimited columns', () => {
      // Pipe with deposit empty: | Narration | Withdrawal | Deposit | Balance |
      const pipeDebit = '12/08/2026 | DMART SUPERMARKET | 2,340.50 | | 9,209.50 |';
      const debitTxns = StatementsService.parseTransactions(pipeDebit);
      assert.strictEqual(debitTxns.length, 1);
      assert.strictEqual(debitTxns[0].amount, 2340.50);
      assert.strictEqual(debitTxns[0].type, TransactionType.EXPENSE);

      // Pipe with withdrawal empty: | Narration | Withdrawal | Deposit | Balance |
      const pipeCredit = '02/08/2026 | CONSULTING PAYMENT | | 15,000.00 | 24,209.50 |';
      const creditTxns = StatementsService.parseTransactions(pipeCredit);
      assert.strictEqual(creditTxns.length, 1);
      assert.strictEqual(creditTxns[0].amount, 15000);
      assert.strictEqual(creditTxns[0].type, TransactionType.INCOME);
    });

    it('distinguishes CR (Income) and DR (Expense) with identical amounts using Running Balance Differential', () => {
      // Opening balance: 3,699.03
      // Row 1: 150.00 -> balance 3,519.03 (Decreased: EXPENSE / DR)
      // Row 2: 150.00 -> balance 3,669.03 (Increased: INCOME / CR)
      const text = `
Opening Balance 3,699.03
30-07-2026 UPI:392313540561:sangamedu@axl( SANGAM GADDI):Pay 150.00 3,519.03
30-07-2026 UPI:664696950323:sangamedu@ybl( SANGAM GADDI):Pay 150.00 3,669.03
      `;
      const txns = StatementsService.parseTransactions(text);
      assert.strictEqual(txns.length, 2);

      // First 150.00: balance went down from 3699.03 to 3519.03 -> EXPENSE
      assert.strictEqual(txns[0].amount, 150);
      assert.strictEqual(txns[0].type, TransactionType.EXPENSE);

      // Second 150.00: balance went up from 3519.03 to 3669.03 -> INCOME
      assert.strictEqual(txns[1].amount, 150);
      assert.strictEqual(txns[1].type, TransactionType.INCOME);
    });

    it('identifies Credits from P2P senders as INCOME using balance increase', () => {
      const text = `
Opening Balance 3,629.03
30-07-2026 UPI:315284546597:8904878079@axl( Yateesh Mattur): 40.00 3,669.03
      `;
      const txns = StatementsService.parseTransactions(text);
      assert.strictEqual(txns.length, 1);
      assert.strictEqual(txns[0].amount, 40);
      assert.strictEqual(txns[0].type, TransactionType.INCOME);
    });
  });
});
