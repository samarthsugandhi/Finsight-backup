import crypto from 'crypto';
import { TransactionType } from '@prisma/client';

/**
 * Normalizes a transaction description to its canonical merchant / payee entity.
 * Strips dynamic 10-14 digit UPI reference / UTR / RRN numbers, bank transaction IDs,
 * provider VPA handles (@axl, @ybl, etc.), and generic prefixes/suffixes.
 * If parenthesized name exists (e.g. `(SANGAM GADDI)`), uses the canonical beneficiary name.
 */
export function normalizeTransactionDescription(description: string): string {
  if (!description || typeof description !== 'string') return '';
  let str = description.trim();

  // 1. If there is a parenthesized beneficiary or merchant name, extract it
  const parenMatch = str.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].replace(/[^a-zA-Z0-9\s]/g, ' ').trim().toLowerCase().replace(/\s+/g, ' ');
    if (inside.length >= 2) {
      return inside;
    }
  }

  // 2. Strip 10-14 digit numeric reference / UTR / RRN numbers
  str = str.replace(/\b\d{10,14}\b/g, '');

  // 3. Strip UPI handles (@okaxis, @ybl, @axl, etc.)
  str = str.replace(/@[a-zA-Z0-9.\-_]+/g, '');

  // 4. Strip common prefixes / suffixes like 'UPI:', 'Pay', 'Payment', 'Paym'
  str = str.replace(/^UPI:?/i, '');
  str = str.replace(/:\s*(Pay|Payment|Paym)$/i, '');

  // 5. Clean symbols and normalize spaces
  str = str.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().toLowerCase().replace(/\s+/g, ' ');
  return str || (description || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Generates an idempotent SHA-256 hash for a transaction.
 * Combines userId, standardized ISO date string (YYYY-MM-DD), formatted 2-decimal amount,
 * canonicalized payee/entity description, and transaction type.
 */
export function computeTransactionHash(
  userId: number,
  date: Date,
  amount: number,
  description: string,
  type: TransactionType
): string {
  const dateStr =
    date instanceof Date && !isNaN(date.getTime())
      ? date.toISOString().slice(0, 10)
      : String(date).slice(0, 10);
  const normalizedAmount = Number(amount).toFixed(2);
  const normalizedDesc = normalizeTransactionDescription(description);
  const rawPayload = `${userId}|${dateStr}|${normalizedAmount}|${normalizedDesc}|${type}`;

  return crypto.createHash('sha256').update(rawPayload).digest('hex');
}

/**
 * Predefined Keyword Dictionary mapping category names and aliases to standard keywords.
 * Covers Indian & global merchants, supermarkets, retail, subscriptions, food staples, utilities, etc.
 */
export const KEYWORD_DICTIONARY: Record<
  string,
  { type: TransactionType; aliases: string[]; keywords: string[] }
> = {
  // ─── EXPENSES ─────────────────────────────────────────────
  'Food & Dining': {
    type: TransactionType.EXPENSE,
    aliases: ['Food', 'Dining', 'Food & Dining'],
    keywords: [
      'swiggy',
      'zomato',
      'vadapav',
      'vada pav',
      'mcdonalds',
      'mcdonald',
      'kfc',
      'burger king',
      'starbucks',
      'cafe coffee day',
      'ccd',
      'dominos',
      'domino',
      'pizza hut',
      'pizza',
      'burger',
      'shawarma',
      'biryani',
      'dosa',
      'idli',
      'thali',
      'samosa',
      'chaat',
      'restaurant',
      'diner',
      'dhaba',
      'bakery',
      'sweets',
      'subway',
      'haldiram',
      'barbeque nation',
      'chai point',
      'chaayos',
      'chai',
      'tea',
      'coffee',
      'canteen',
      'mess',
      'lunch',
      'dinner',
      'breakfast',
      'snack',
      'snacks',
      'food',
      'dining',
      'eats',
    ],
  },
  'Groceries': {
    type: TransactionType.EXPENSE,
    aliases: ['Groceries & Household', 'Groceries', 'Food'],
    keywords: [
      'dmart',
      'blinkit',
      'zepto',
      'instamart',
      'bigbasket',
      'bb daily',
      'spencer',
      'nature basket',
      'supermarket',
      'grocery',
      'groceries',
      'vegetables',
      'fruits',
      'household',
      'provision',
      'general store',
    ],
  },
  'Rent & Housing': {
    type: TransactionType.EXPENSE,
    aliases: ['Rent', 'Rent & Housing'],
    keywords: [
      'house rent',
      'flat rent',
      'room rent',
      'pg rent',
      'landlord',
      'society maintenance',
      'maintenance charge',
      'nobroker',
      'housing society',
      'apartment rent',
      'rent payment',
      'monthly rent',
      'rent',
    ],
  },
  'Bills & Utilities': {
    type: TransactionType.EXPENSE,
    aliases: ['Utilities & Bills', 'Bills & Utilities', 'Bills'],
    keywords: [
      'electricity',
      'bescom',
      'tneb',
      'bses',
      'adani electricity',
      'tata power',
      'cesc',
      'water bill',
      'jal board',
      'piped gas',
      'indane',
      'hp gas',
      'bharat gas',
      'mahanagar gas',
      'igl',
      'airtel',
      'jio',
      'vodafone',
      'vi recharge',
      'bsnl',
      'broadband',
      'wifi',
      'act fibernet',
      'hathway',
      'tataplay',
      'tata sky',
      'dth',
      'dish tv',
      'postpaid',
      'prepaid recharge',
      'utility bill',
      'billdesk',
      'bill payment',
      'recharge',
      'utility',
      'bills',
    ],
  },
  'Education & Stationery': {
    type: TransactionType.EXPENSE,
    aliases: ['Education', 'Education & Stationery'],
    keywords: [
      'book',
      'books',
      'stationery',
      'coursera',
      'udemy',
      'edx',
      'unacademy',
      'byjus',
      'simplilearn',
      'upgrad',
      'school fee',
      'college fee',
      'tuition fee',
      'tuition',
      'coaching',
      'exam fee',
      'university',
      'library',
      'course',
      'education',
    ],
  },
  'Travel & Transport': {
    type: TransactionType.EXPENSE,
    aliases: ['Transport', 'Travel', 'Travel & Transport'],
    keywords: [
      'uber',
      'ola',
      'rapido',
      'petrol',
      'diesel',
      'fuel',
      'shell',
      'hpcl',
      'bpcl',
      'iocl',
      'indian oil',
      'bharat petroleum',
      'hindustan petroleum',
      'metro',
      'dmrc',
      'bmrc',
      'fastag',
      'toll',
      'irctc',
      'indian railways',
      'railway',
      'redbus',
      'abhibus',
      'chalo',
      'bus ticket',
      'parking',
      'cab',
      'auto fare',
      'taxi',
      'gas station',
      'cng',
      'makemytrip',
      'mmt',
      'goibibo',
      'cleartrip',
      'easemytrip',
      'yatra',
      'agoda',
      'booking.com',
      'airbnb',
      'indigo',
      'air india',
      'spicejet',
      'vistara',
      'akasa air',
      'airline',
      'flight',
      'hotel',
      'resort',
      'hostel',
      'oyorooms',
      'treebo',
      'fabhotels',
      'taj hotel',
      'marriott',
      'hyatt',
      'trip',
      'vacation',
      'tour',
      'travel',
    ],
  },
  'Shopping': {
    type: TransactionType.EXPENSE,
    aliases: ['Shopping & Entertainment', 'Shopping'],
    keywords: [
      'amazon',
      'flipkart',
      'myntra',
      'ajio',
      'meesho',
      'nykaa',
      'tata cliq',
      'zara',
      'h&m',
      'hnm',
      'uniqlo',
      'marks & spencer',
      'decathlon',
      'ikea',
      'croma',
      'reliance digital',
      'vijay sales',
      'trends',
      'pantaloons',
      'westside',
      'max fashion',
      'shoppers stop',
      'lifestyle',
      'lenskart',
      'apple store',
      'shopping',
      'clothing',
      'apparel',
      'footwear',
      'retail',
    ],
  },
  'Entertainment': {
    type: TransactionType.EXPENSE,
    aliases: ['Entertainment'],
    keywords: [
      'netflix',
      'spotify',
      'prime video',
      'hotstar',
      'disney hotstar',
      'disney+',
      'sonyliv',
      'zee5',
      'bookmyshow',
      'pvr',
      'inox',
      'cinepolis',
      'cinema',
      'movie',
      'theatre',
      'youtube premium',
      'apple music',
      'gaana',
      'wynk',
      'steam',
      'playstation',
      'xbox',
      'nintendo',
      'gaming',
      'audible',
      'kindle',
      'concert',
      'amusement park',
      'entertainment',
    ],
  },
  'Healthcare & Fitness': {
    type: TransactionType.EXPENSE,
    aliases: ['Healthcare', 'Healthcare & Fitness'],
    keywords: [
      'apollo',
      '1mg',
      'tata 1mg',
      'pharmeasy',
      'netmeds',
      'medplus',
      'pharmacy',
      'chemist',
      'medicals',
      'medicine',
      'medicines',
      'hospital',
      'clinic',
      'dr.',
      'doctor',
      'dental',
      'dentist',
      'diagnostics',
      'dr lal pathlabs',
      'metropolis',
      'thyrocare',
      'max healthcare',
      'fortis',
      'manipal',
      'health checkup',
      'optician',
      'pathology',
      'healthcare',
      'gym',
      'fitness',
      'cult.fit',
      'cult fit',
      'gold gym',
    ],
  },
  'Transfers - Sent (P2P)': {
    type: TransactionType.EXPENSE,
    aliases: ['Transfers - Sent (P2P)'],
    keywords: [
      'transfer sent',
      'p2p transfer',
      'sent money',
    ],
  },
  'Internal Transfer': {
    type: TransactionType.TRANSFER,
    aliases: ['Internal Transfer', 'Self Transfer', 'Account Transfer'],
    keywords: [
      'self transfer',
      'own account',
      'own a/c',
      'transfer to self',
      'transfer to own account',
      'transfer to own a/c',
      'between accounts',
      'between own accounts',
      'internal transfer',
      'account transfer',
      'trf to own',
      'trf from own',
      'funds transfer self',
    ],
  },
  'Miscellaneous Expense': {
    type: TransactionType.EXPENSE,
    aliases: ['Other Expense', 'Miscellaneous Expense'],
    keywords: [
      'atm cash',
      'atm withdrawal',
      'cash withdrawal',
      'bank charges',
      'annual fee',
      'sms charges',
      'penalty',
      'debit interest',
      'late fee',
    ],
  },

  // ─── INCOME ───────────────────────────────────────────────
  Salary: {
    type: TransactionType.INCOME,
    aliases: ['Salary'],
    keywords: [
      'salary',
      'sal cr',
      'payroll',
      'monthly salary',
      'stipend',
      'wages',
      'remuneration',
      'direct deposit',
      'salary credit',
    ],
  },
  'Pocket Money': {
    type: TransactionType.INCOME,
    aliases: ['Pocket Money / Allowance', 'Pocket Money', 'Allowance'],
    keywords: [
      'pocket money',
      'allowance',
      'monthly allowance',
      'pocket allowance',
    ],
  },
  'Freelance': {
    type: TransactionType.INCOME,
    aliases: ['Freelance / Business', 'Freelance', 'Business'],
    keywords: [
      'upwork',
      'fiverr',
      'freelance',
      'freelancing',
      'contract work',
      'consulting fee',
      'client payment',
      'toptal',
      'freelancer',
      'merchant settlement',
      'pos settlement',
      'stripe payout',
      'razorpay settlement',
      'payu settlement',
      'invoice payment',
      'business revenue',
      'settlement cr',
    ],
  },
  'Investments': {
    type: TransactionType.INCOME,
    aliases: ['Investments / Dividends', 'Investments', 'Investment'],
    keywords: [
      'dividend',
      'zerodha',
      'groww',
      'angelone',
      'upstox',
      'kuvera',
      'indmoney',
      'mutual fund redemption',
      'mf redemption',
      'stock sale',
      'capital gains',
      'securities payout',
    ],
  },
  Refunds: {
    type: TransactionType.INCOME,
    aliases: ['Refunds', 'Other Income'],
    keywords: [
      'refund',
      'reversal',
      'tax refund',
      'it refund',
      'chargeback',
      'cashback cr',
      'cashback',
    ],
  },
  'Transfers - Received (P2P)': {
    type: TransactionType.INCOME,
    aliases: ['Transfers - Received (P2P)'],
    keywords: [
      'transfer received',
      'received money',
      'p2p received',
    ],
  },
  'Miscellaneous Income': {
    type: TransactionType.INCOME,
    aliases: ['Other Income', 'Gift', 'Bonus', 'Interest', 'Miscellaneous Income'],
    keywords: [
      'interest credit',
      'interest cr',
      'sb int',
      'savings interest',
      'fd interest',
      'term deposit interest',
      'interest credited',
      'bonus',
      'performance bonus',
      'annual bonus',
      'incentive',
      'appraisal bonus',
      'gift',
      'cash gift',
      'rewards credit',
      'scratch card win',
      'promotional reward',
    ],
  },
};

/**
 * Checks if a transaction description matches standard predefined keywords from the dictionary.
 * Searches with word-boundary awareness, punctuation separation, and substring fallback.
 *
 * @param description - The raw or cleaned transaction description.
 * @param preferredType - Optional TransactionType (INCOME or EXPENSE) to prioritize relevant categories.
 * @returns The matched category name or null.
 */
export function matchKeyword(description: string, preferredType?: TransactionType): string | null {
  if (!description || typeof description !== 'string') return null;

  const text = description.toLowerCase().trim();
  if (!text) return null;

  const normalizedText = ` ${text.replace(/[^a-z0-9&+/.-]/g, ' ')} `;

  const entries = Object.entries(KEYWORD_DICTIONARY);
  if (preferredType) {
    entries.sort((a, b) => {
      const aMatch = a[1].type === preferredType ? 0 : 1;
      const bMatch = b[1].type === preferredType ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  for (const [categoryName, categoryData] of entries) {
    const sortedKeywords = [...categoryData.keywords].sort((a, b) => b.length - a.length);

    for (const keyword of sortedKeywords) {
      const kw = keyword.toLowerCase().trim();
      if (!kw) continue;

      if (normalizedText.includes(` ${kw} `) || text.includes(kw)) {
        return categoryName;
      }
    }
  }

  return null;
}

/**
 * Resolves a category name to an ID from categoryNameToId map, checking aliases if needed.
 */
export function resolveCategoryId(categoryName: string, categoryNameToId: Map<string, number>): number | null {
  const exact = categoryNameToId.get(categoryName.toLowerCase());
  if (exact) return exact;

  const def = KEYWORD_DICTIONARY[categoryName];
  if (def && def.aliases) {
    for (const alias of def.aliases) {
      const aliasId = categoryNameToId.get(alias.toLowerCase());
      if (aliasId) return aliasId;
    }
  }

  return null;
}

/**
 * Detects whether a transaction is a Peer-to-Peer (P2P) or personal UPI / Fund transfer.
 * Identifies UPI handles (@okaxis, @ybl, etc.), personal narrative styles ("Punith: food", "Paid to..."),
 * and P2P prefixes.
 *
 * @param description - The transaction description.
 * @returns true if the transaction represents a P2P or UPI transfer.
 */
export function isP2POrUpi(description: string): boolean {
  if (!description || typeof description !== 'string') return false;

  const text = description.toLowerCase().trim();

  // 1. UPI Handle patterns (e.g. name@okhdfcbank, user@paytm, 9876543210@ybl, @gpay)
  const upiHandleRegex = /[a-zA-Z0-9.\-_]{2,}@(ok[a-zA-Z]+|ybl|paytm|upi|icici|axis|sbi|ibl|axl|postbank|idfc|federal|kotak|barodampay|airtel|gpay)/i;
  if (upiHandleRegex.test(text)) {
    return true;
  }

  // 2. Personal P2P narrative patterns: e.g. "Name: remark", "Name - remark", "Paid to Name", "Transfer to Name"
  const personalNarrativeRegex = /^(paid\s+to|transfer\s+to|transfer\s+from|sent\s+to|received\s+from|[a-zA-Z]+\s*[:\-])/i;
  if (personalNarrativeRegex.test(text)) {
    return true;
  }

  // 3. UPI/Transfer prefix and pattern indicators
  const p2pKeywords = [
    'upi/',
    'upi-',
    'upi_',
    'upi/p2p',
    'upi/p2a',
    'p2p/',
    'p2a/',
    'transfer to',
    'transfer from',
    'paid to',
    'sent to',
    'received from',
    'fund transfer',
    'person to person',
    'imps-',
    'neft-',
    'rtgs-',
    'vpa',
  ];

  for (const pattern of p2pKeywords) {
    if (text.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Result of the multi-step categorization pipeline.
 */
export interface CategorizationResult {
  categoryId?: number;
  categoryName?: string;
  isAutoCategorized: boolean;
  matchSource: 'KEYWORD' | 'USER_RULE' | 'FALLBACK_REVIEW_QUEUE';
}

/**
 * Executes the 4-step Auto-Categorization Pipeline:
 *
 * Step 1: Keyword Match (comprehensive dictionary)
 * Step 2: Peer-to-Peer (P2P) / UPI Edge Case:
 *         - If P2P with keyword (e.g. "Punith: food", "Arun food") → auto-categorize.
 *         - If P2P without keyword → route to user DB rules or review queue.
 * Step 3: User Database Rule Match (Vendor Match / saved user rules from DB).
 * Step 4: Fallback / Review Queue: if none matched, queue for manual review.
 *
 * @param description - Transaction description string.
 * @param type - Transaction type (INCOME or EXPENSE).
 * @param userRules - List of user-defined categorization rules from DB.
 * @param categoryNameToId - In-memory map of lowercase category name to category ID.
 */
export function categorizeTransactionPipeline(
  description: string,
  type: TransactionType,
  userRules: Array<{ id: number; descriptionPattern: string; exactMatch: boolean; categoryId: number }>,
  categoryNameToId: Map<string, number>
): CategorizationResult {
  const desc = (description || '').trim();
  const descLower = desc.toLowerCase();

  // ─────────────────────────────────────────────────────────
  // STEP 1 & STEP 2: Keyword Matching & P2P / UPI Analysis
  // ─────────────────────────────────────────────────────────
  const matchedKeywordCategory = matchKeyword(desc, type);

  if (matchedKeywordCategory) {
    const categoryId = resolveCategoryId(matchedKeywordCategory, categoryNameToId);
    if (categoryId) {
      return {
        categoryId,
        categoryName: matchedKeywordCategory,
        isAutoCategorized: true,
        matchSource: 'KEYWORD',
      };
    }
  }

  // If it is P2P and had NO keyword match (e.g. "Paid Arun", "Punith", "UPI-123"),
  // we do NOT assume categories. We check User Database Rules in Step 3.

  // ─────────────────────────────────────────────────────────
  // STEP 3: User Database Rule Match (Vendor Match)
  // ─────────────────────────────────────────────────────────
  if (userRules && userRules.length > 0) {
    const exactRule = userRules.find(
      (rule) => rule.exactMatch && descLower === rule.descriptionPattern.toLowerCase()
    );

    if (exactRule) {
      return {
        categoryId: exactRule.categoryId,
        isAutoCategorized: true,
        matchSource: 'USER_RULE',
      };
    }

    const patternRule = userRules.find(
      (rule) => !rule.exactMatch && descLower.includes(rule.descriptionPattern.toLowerCase())
    );

    if (patternRule) {
      return {
        categoryId: patternRule.categoryId,
        isAutoCategorized: true,
        matchSource: 'USER_RULE',
      };
    }
  }

  // ─────────────────────────────────────────────────────────
  // STEP 4: Fallback / Review Queue
  // ─────────────────────────────────────────────────────────
  return {
    isAutoCategorized: false,
    matchSource: 'FALLBACK_REVIEW_QUEUE',
  };
}
