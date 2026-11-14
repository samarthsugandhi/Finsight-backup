import {
  PrismaClient,
  TransactionType,
  HoldingType,
  TransactionSide,
  GoldPurity,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeTransactionHash } from "../src/utils/categorizationRules";
import { healthScoreService } from "../src/services/healthScore.service";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

interface DemoUserConfig {
  email: string;
  name: string;
  password: string;
  targetScore: number;
}

const DEMO_USERS: DemoUserConfig[] = [
  {
    email: "P1@gmail.com",
    name: "P1 – A Saver",
    password: "password-p1@1234",
    targetScore: 99,
  },
  {
    email: "P2@gmail.com",
    name: "P2 – B Overspender",
    password: "password-p2@1234",
    targetScore: 32,
  },
  {
    email: "P3@gmail.com",
    name: "P3 – C Concentrated",
    password: "password-p3@1234",
    targetScore: 69,
  },
  {
    email: "P4@gmail.com",
    name: "P4 – D Indebted",
    password: "password-p4@1234",
    targetScore: 51,
  },
];

async function seedUser(config: DemoUserConfig) {
  let user = await prisma.user.findUnique({
    where: { email: config.email },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(config.password, SALT_ROUNDS);
    user = await prisma.user.create({
      data: {
        email: config.email,
        name: config.name,
        passwordHash,
      },
    });
    console.log(`  ✓ Created user ${config.name} (${config.email})`);
  } else {
    // Ensure password is up to date with the required credential
    const matches = await bcrypt.compare(config.password, user.passwordHash);
    if (!matches) {
      const passwordHash = await bcrypt.hash(config.password, SALT_ROUNDS);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, name: config.name },
      });
      console.log(`  ✓ Updated password for ${config.name} (${config.email})`);
    } else {
      console.log(`  • User ${config.name} (${config.email}) already exists`);
    }
  }

  return user;
}

async function addTransactionIfMissing(
  userId: number,
  categoryId: number,
  type: TransactionType,
  amount: number,
  description: string,
  date: Date,
  sourceAccount: string = "HDFC Bank Savings"
) {
  const hash = computeTransactionHash(userId, date, amount, description, type);

  const existing = await prisma.transaction.findFirst({
    where: {
      userId,
      transactionHash: hash,
    },
  });

  if (!existing) {
    await prisma.transaction.create({
      data: {
        userId,
        categoryId,
        type,
        amount,
        description,
        date,
        sourceAccount,
        transactionHash: hash,
      },
    });
  }
}

async function setBudget(
  userId: number,
  categoryId: number,
  monthlyLimit: number,
  month: number,
  year: number
) {
  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month,
        year,
      },
    },
    update: {
      monthlyLimit,
    },
    create: {
      userId,
      categoryId,
      monthlyLimit,
      month,
      year,
    },
  });
}

async function getOrCreateGoal(
  userId: number,
  title: string,
  targetAmount: number,
  isEmergencyFund: boolean,
  targetDate: Date
) {
  let goal = await prisma.goal.findFirst({
    where: { userId, title },
  });

  if (!goal) {
    goal = await prisma.goal.create({
      data: {
        userId,
        title,
        targetAmount,
        isEmergencyFund,
        targetDate,
      },
    });
  }
  return goal;
}

async function addGoalContributionIfMissing(
  userId: number,
  goalId: number,
  amount: number,
  date: Date,
  note: string
) {
  const existing = await prisma.goalContribution.findFirst({
    where: {
      userId,
      goalId,
      amount,
      date,
    },
  });

  if (!existing) {
    await prisma.goalContribution.create({
      data: {
        userId,
        goalId,
        amount,
        date,
        note,
      },
    });
  }
}

async function getOrCreateHolding(
  userId: number,
  data: {
    type: HoldingType;
    name: string;
    symbol?: string;
    purity?: GoldPurity;
    subType?: string;
    notes?: string;
    manualCurrentValue?: number;
    principal?: number;
    interestRate?: number;
    startDate?: Date;
    maturityDate?: Date;
    maturityAmount?: number;
    transactions?: Array<{
      side: TransactionSide;
      quantity: number;
      price: number;
      date: Date;
    }>;
  }
) {
  let holding = await prisma.portfolioHolding.findFirst({
    where: {
      userId,
      name: data.name,
      type: data.type,
    },
    include: { transactions: true },
  });

  if (!holding) {
    holding = await prisma.portfolioHolding.create({
      data: {
        userId,
        type: data.type,
        name: data.name,
        symbol: data.symbol,
        purity: data.purity,
        subType: data.subType,
        notes: data.notes,
        manualCurrentValue: data.manualCurrentValue,
        principal: data.principal,
        interestRate: data.interestRate,
        startDate: data.startDate,
        maturityDate: data.maturityDate,
        maturityAmount: data.maturityAmount,
        source: "MANUAL",
      },
      include: { transactions: true },
    });

    if (data.transactions && data.transactions.length > 0) {
      for (const tx of data.transactions) {
        await prisma.portfolioTransaction.create({
          data: {
            userId,
            holdingId: holding.id,
            side: tx.side,
            quantity: tx.quantity,
            price: tx.price,
            date: tx.date,
          },
        });
      }
    }
  }

  return holding;
}

export async function seedDemoUsers() {
  console.log("==================================================");
  console.log("   FinSight Demo Users Seeding (Aug–Nov 2026)");
  console.log("==================================================\n");

  // Fetch Category mappings
  const categories = await prisma.category.findMany();
  const catMap = new Map<string, number>();
  for (const c of categories) {
    catMap.set(c.name.toLowerCase(), c.id);
  }

  const salaryCat = catMap.get("salary") || 1;
  const rentCat = catMap.get("rent & housing") || 14;
  const groceryCat = catMap.get("groceries") || 12;
  const billsCat = catMap.get("bills & utilities") || 8;
  const healthCat = catMap.get("healthcare & fitness") || 13;
  const foodCat = catMap.get("food & dining") || 11;
  const entCat = catMap.get("entertainment") || 10;
  const shoppingCat = catMap.get("shopping") || 15;
  const travelCat = catMap.get("travel & transport") || 17;
  const emiCat = catMap.get("emi") || 19;

  // -------------------------------------------------------------
  // USER 1: P1 – A Saver (Target FinScore: 99)
  // -------------------------------------------------------------
  console.log("\n▶ Seeding P1 – A Saver...");
  const p1User = await seedUser(DEMO_USERS[0]);

  // Holdings for P1: 4 balanced asset classes (Stock, ELSS MF, SGB Gold, Tax-Saver FD)
  await getOrCreateHolding(p1User.id, {
    type: HoldingType.STOCK,
    name: "Reliance Industries Ltd",
    symbol: "RELIANCE:NSE",
    manualCurrentValue: 300000,
    transactions: [
      {
        side: TransactionSide.BUY,
        quantity: 120,
        price: 2500,
        date: new Date("2026-08-05T10:00:00Z"),
      },
    ],
  });

  await getOrCreateHolding(p1User.id, {
    type: HoldingType.MUTUAL_FUND,
    name: "Mirae Asset Tax Saver Fund",
    subType: "ELSS",
    notes: "3-Year Tax Lock-in ELSS Fund",
    manualCurrentValue: 350000,
    transactions: [
      {
        side: TransactionSide.BUY,
        quantity: 7000,
        price: 50,
        date: new Date("2026-08-05T10:00:00Z"),
      },
    ],
  });

  await getOrCreateHolding(p1User.id, {
    type: HoldingType.GOLD,
    name: "Sovereign Gold Bond 2026-Series IV",
    purity: GoldPurity.PURITY_24K,
    subType: "SGB",
    notes: "Sovereign Gold Bond RBI Tranche",
    manualCurrentValue: 200000,
    transactions: [
      {
        side: TransactionSide.BUY,
        quantity: 32,
        price: 6250,
        date: new Date("2026-08-05T10:00:00Z"),
      },
    ],
  });

  await getOrCreateHolding(p1User.id, {
    type: HoldingType.FIXED_DEPOSIT,
    name: "HDFC Bank 5-Year Tax-Saver FD",
    subType: "TAX_SAVER",
    notes: "5-Year Tax Saver Lock-in FD",
    principal: 250000,
    interestRate: 7.25,
    startDate: new Date("2026-01-15T00:00:00Z"),
    maturityDate: new Date("2031-01-15T00:00:00Z"),
    maturityAmount: 354670,
  });

  // Goals for P1
  const p1Emergency = await getOrCreateGoal(
    p1User.id,
    "Emergency Reserve Fund",
    300000,
    true,
    new Date("2026-12-31")
  );
  await addGoalContributionIfMissing(p1User.id, p1Emergency.id, 100000, new Date("2026-08-15"), "Initial reserve allocation");
  await addGoalContributionIfMissing(p1User.id, p1Emergency.id, 100000, new Date("2026-09-15"), "Quarterly bonus allocation");
  await addGoalContributionIfMissing(p1User.id, p1Emergency.id, 50000, new Date("2026-10-15"), "Emergency fund completion tranche");

  const p1HouseGoal = await getOrCreateGoal(
    p1User.id,
    "New Home Downpayment",
    2500000,
    false,
    new Date("2028-12-31")
  );
  await addGoalContributionIfMissing(p1User.id, p1HouseGoal.id, 150000, new Date("2026-08-20"), "SIP to home fund");
  await addGoalContributionIfMissing(p1User.id, p1HouseGoal.id, 150000, new Date("2026-09-20"), "SIP to home fund");
  await addGoalContributionIfMissing(p1User.id, p1HouseGoal.id, 100000, new Date("2026-10-20"), "SIP to home fund");

  // Budgets for P1 (Aug, Sep, Oct, Nov)
  for (const m of [8, 9, 10, 11]) {
    await setBudget(p1User.id, rentCat, 30000, m, 2026);
    await setBudget(p1User.id, groceryCat, 20000, m, 2026);
    await setBudget(p1User.id, billsCat, 10000, m, 2026);
    await setBudget(p1User.id, entCat, 15000, m, 2026);
  }

  // Transactions for P1
  // August 2026
  await addTransactionIfMissing(p1User.id, salaryCat, TransactionType.INCOME, 150000, "Monthly Salary Credit - Tech Corp", new Date("2026-08-01T09:30:00Z"));
  await addTransactionIfMissing(p1User.id, rentCat, TransactionType.EXPENSE, 25000, "Apartment Monthly Rent Transfer", new Date("2026-08-03T11:00:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 8000, "Nature's Basket Organic Groceries", new Date("2026-08-07T14:20:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 7000, "Zepto Monthly Essentials", new Date("2026-08-18T16:15:00Z"));
  await addTransactionIfMissing(p1User.id, billsCat, TransactionType.EXPENSE, 5000, "Electricity & High-Speed Fiber Internet", new Date("2026-08-10T10:00:00Z"));
  await addTransactionIfMissing(p1User.id, healthCat, TransactionType.EXPENSE, 5000, "Cult.fit Annual Fitness Subscription", new Date("2026-08-05T08:30:00Z"));
  await addTransactionIfMissing(p1User.id, foodCat, TransactionType.EXPENSE, 5000, "Family Dinner at Smoke House Deli", new Date("2026-08-14T20:00:00Z"));
  await addTransactionIfMissing(p1User.id, entCat, TransactionType.EXPENSE, 4000, "Concert Tickets & BookMyShow", new Date("2026-08-22T19:30:00Z"));
  await addTransactionIfMissing(p1User.id, travelCat, TransactionType.EXPENSE, 5000, "Uber Business Commute", new Date("2026-08-26T18:00:00Z"));

  // September 2026
  await addTransactionIfMissing(p1User.id, salaryCat, TransactionType.INCOME, 150000, "Monthly Salary Credit - Tech Corp", new Date("2026-09-01T09:30:00Z"));
  await addTransactionIfMissing(p1User.id, rentCat, TransactionType.EXPENSE, 25000, "Apartment Monthly Rent Transfer", new Date("2026-09-03T11:00:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 8500, "Nature's Basket Organic Groceries", new Date("2026-09-06T15:00:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 6500, "Zepto Monthly Essentials", new Date("2026-09-17T17:00:00Z"));
  await addTransactionIfMissing(p1User.id, billsCat, TransactionType.EXPENSE, 5000, "Electricity & High-Speed Fiber Internet", new Date("2026-09-10T10:00:00Z"));
  await addTransactionIfMissing(p1User.id, foodCat, TransactionType.EXPENSE, 5000, "Weekend Dining & Coffee", new Date("2026-09-13T19:45:00Z"));
  await addTransactionIfMissing(p1User.id, entCat, TransactionType.EXPENSE, 5000, "Theatre & Movie Outing", new Date("2026-09-20T21:00:00Z"));
  await addTransactionIfMissing(p1User.id, travelCat, TransactionType.EXPENSE, 5000, "Uber Business Commute", new Date("2026-09-25T18:30:00Z"));

  // October 2026 (CRITICAL: Rent 25k, Groceries 15k, Bills 5k, Food 10k, Entertainment 10k -> Total 65k, Essential 45k, Budget 75k)
  await addTransactionIfMissing(p1User.id, salaryCat, TransactionType.INCOME, 150000, "Monthly Salary Credit - Tech Corp", new Date("2026-10-01T09:30:00Z"));
  await addTransactionIfMissing(p1User.id, rentCat, TransactionType.EXPENSE, 25000, "Apartment Monthly Rent Transfer", new Date("2026-10-03T11:00:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 8000, "Nature's Basket Organic Groceries", new Date("2026-10-07T14:30:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 7000, "Zepto Monthly Essentials", new Date("2026-10-18T16:00:00Z"));
  await addTransactionIfMissing(p1User.id, billsCat, TransactionType.EXPENSE, 5000, "Electricity & High-Speed Fiber Internet", new Date("2026-10-10T10:00:00Z"));
  await addTransactionIfMissing(p1User.id, foodCat, TransactionType.EXPENSE, 10000, "Fine Dining at Olive Bar & Kitchen", new Date("2026-10-14T20:30:00Z"));
  await addTransactionIfMissing(p1User.id, entCat, TransactionType.EXPENSE, 10000, "Music Festival Tickets", new Date("2026-10-24T18:00:00Z"));

  // November 2026 (through Nov 14)
  await addTransactionIfMissing(p1User.id, salaryCat, TransactionType.INCOME, 150000, "Monthly Salary Credit - Tech Corp", new Date("2026-11-01T09:30:00Z"));
  await addTransactionIfMissing(p1User.id, rentCat, TransactionType.EXPENSE, 25000, "Apartment Monthly Rent Transfer", new Date("2026-11-03T11:00:00Z"));
  await addTransactionIfMissing(p1User.id, groceryCat, TransactionType.EXPENSE, 6000, "Zepto Fresh Supplies", new Date("2026-11-06T15:20:00Z"));
  await addTransactionIfMissing(p1User.id, billsCat, TransactionType.EXPENSE, 5000, "Electricity & High-Speed Fiber Internet", new Date("2026-11-09T10:00:00Z"));
  await addTransactionIfMissing(p1User.id, foodCat, TransactionType.EXPENSE, 3500, "Weekend Brunch with Friends", new Date("2026-11-12T13:00:00Z"));

  // -------------------------------------------------------------
  // USER 2: P2 – B Overspender (Target FinScore: 32)
  // -------------------------------------------------------------
  console.log("\n▶ Seeding P2 – B Overspender...");
  const p2User = await seedUser(DEMO_USERS[1]);

  // Goals for P2 (tiny emergency goal)
  const p2Emergency = await getOrCreateGoal(
    p2User.id,
    "Emergency Safety Net",
    150000,
    true,
    new Date("2027-12-31")
  );
  await addGoalContributionIfMissing(p2User.id, p2Emergency.id, 1000, new Date("2026-08-25"), "Small transfer");
  await addGoalContributionIfMissing(p2User.id, p2Emergency.id, 1000, new Date("2026-10-28"), "Spare change saved");

  // Budgets for P2 (Aug, Sep, Oct, Nov) - heavily breached in discretionary categories
  for (const m of [8, 9, 10, 11]) {
    await setBudget(p2User.id, foodCat, 12000, m, 2026);
    await setBudget(p2User.id, shoppingCat, 10000, m, 2026);
    await setBudget(p2User.id, entCat, 6000, m, 2026);
    await setBudget(p2User.id, groceryCat, 15000, m, 2026);
    await setBudget(p2User.id, billsCat, 17000, m, 2026);
  }

  // Transactions for P2
  // August 2026 (Income 80k, Exp 76k)
  await addTransactionIfMissing(p2User.id, salaryCat, TransactionType.INCOME, 80000, "Salary Credit - Marketing Agency", new Date("2026-08-01T10:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 10000, "Swiggy & Zomato Daily Orders", new Date("2026-08-05T13:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 10000, "Dinner & Drinks at Social", new Date("2026-08-16T21:30:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 12000, "Zara Clothing Autumn Haul", new Date("2026-08-10T17:00:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 8000, "Amazon Gadgets & Accessories", new Date("2026-08-22T14:30:00Z"));
  await addTransactionIfMissing(p2User.id, entCat, TransactionType.EXPENSE, 15000, "VIP Nightclub Table & Drinks", new Date("2026-08-20T23:30:00Z"));
  await addTransactionIfMissing(p2User.id, groceryCat, TransactionType.EXPENSE, 13000, "Supermarket Impulse Shopping", new Date("2026-08-12T16:00:00Z"));
  await addTransactionIfMissing(p2User.id, billsCat, TransactionType.EXPENSE, 8000, "Postpaid & Electricity Bills", new Date("2026-08-08T11:00:00Z"));

  // September 2026 (Income 80k, Exp 78k)
  await addTransactionIfMissing(p2User.id, salaryCat, TransactionType.INCOME, 80000, "Salary Credit - Marketing Agency", new Date("2026-09-01T10:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 11000, "Swiggy Gourmet Orders", new Date("2026-09-07T13:30:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 12000, "Club House Dinners", new Date("2026-09-18T22:00:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 13000, "Myntra Big Fashion Festival", new Date("2026-09-12T18:00:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 8000, "Sneakers Purchase - VegNonVeg", new Date("2026-09-24T15:30:00Z"));
  await addTransactionIfMissing(p2User.id, entCat, TransactionType.EXPENSE, 14000, "Weekend Lounges & Events", new Date("2026-09-21T23:00:00Z"));
  await addTransactionIfMissing(p2User.id, groceryCat, TransactionType.EXPENSE, 12000, "Gourmet Groceries & Snacks", new Date("2026-09-15T16:30:00Z"));
  await addTransactionIfMissing(p2User.id, billsCat, TransactionType.EXPENSE, 8000, "Utility Bills Payment", new Date("2026-09-09T11:00:00Z"));

  // October 2026 (CRITICAL: Income 80k, Food 22k, Shopping 21.5k, Ent 14k, Groceries 12k, Bills 8k -> Total 77.5k, Target Score: 32)
  await addTransactionIfMissing(p2User.id, salaryCat, TransactionType.INCOME, 80000, "Salary Credit - Marketing Agency", new Date("2026-10-01T10:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 6500, "Zomato Everyday Lunch Orders", new Date("2026-10-04T13:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 7500, "Swiggy Dinners & Late Night", new Date("2026-10-12T22:30:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 8000, "Cocktails & Dinner at Bastian", new Date("2026-10-23T21:45:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 11500, "H&M and Zara Fall Collection", new Date("2026-10-08T17:15:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 10000, "Apple Watch Accessories & Tech", new Date("2026-10-19T16:00:00Z"));
  await addTransactionIfMissing(p2User.id, entCat, TransactionType.EXPENSE, 8000, "Halloween Party Passes", new Date("2026-10-16T22:00:00Z"));
  await addTransactionIfMissing(p2User.id, entCat, TransactionType.EXPENSE, 6000, "Weekend Lounges with Friends", new Date("2026-10-27T23:00:00Z"));
  await addTransactionIfMissing(p2User.id, groceryCat, TransactionType.EXPENSE, 12000, "Instamart Frequent Orders", new Date("2026-10-11T18:00:00Z"));
  await addTransactionIfMissing(p2User.id, billsCat, TransactionType.EXPENSE, 8000, "Mobile, Wifi & Credit Card Fees", new Date("2026-10-06T11:00:00Z"));

  // November 2026 (through Nov 14)
  await addTransactionIfMissing(p2User.id, salaryCat, TransactionType.INCOME, 80000, "Salary Credit - Marketing Agency", new Date("2026-11-01T10:00:00Z"));
  await addTransactionIfMissing(p2User.id, shoppingCat, TransactionType.EXPENSE, 12000, "Diwali Sale Shopping Frenzy", new Date("2026-11-03T16:30:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 6000, "Zomato Orders", new Date("2026-11-05T13:00:00Z"));
  await addTransactionIfMissing(p2User.id, foodCat, TransactionType.EXPENSE, 5000, "Pub Dining & Craft Beer", new Date("2026-11-08T21:00:00Z"));
  await addTransactionIfMissing(p2User.id, entCat, TransactionType.EXPENSE, 7000, "Live Concert Tickets", new Date("2026-11-10T19:30:00Z"));
  await addTransactionIfMissing(p2User.id, groceryCat, TransactionType.EXPENSE, 6000, "Blinkit Quick Delivery", new Date("2026-11-12T17:00:00Z"));

  // -------------------------------------------------------------
  // USER 3: P3 – C Concentrated (Target FinScore: 69)
  // -------------------------------------------------------------
  console.log("\n▶ Seeding P3 – C Concentrated...");
  const p3User = await seedUser(DEMO_USERS[2]);

  // Holdings for P3: 90% Infosys Stock + 10% Index Fund (ELSS lock-in for clean resilience score)
  await getOrCreateHolding(p3User.id, {
    type: HoldingType.STOCK,
    name: "Infosys Ltd",
    symbol: "INFY:NSE",
    manualCurrentValue: 900000,
    transactions: [
      {
        side: TransactionSide.BUY,
        quantity: 600,
        price: 1500,
        date: new Date("2026-08-05T10:00:00Z"),
      },
    ],
  });

  await getOrCreateHolding(p3User.id, {
    type: HoldingType.MUTUAL_FUND,
    name: "Nippon India Nifty 50 Index Fund",
    subType: "ELSS",
    notes: "Tax-Saver Index Fund",
    manualCurrentValue: 100000,
    transactions: [
      {
        side: TransactionSide.BUY,
        quantity: 4000,
        price: 25,
        date: new Date("2026-08-05T10:00:00Z"),
      },
    ],
  });

  // Goals for P3 (Emergency fund of ₹60,000 for target score 69)
  const p3Emergency = await getOrCreateGoal(
    p3User.id,
    "Emergency Reserve Fund",
    200000,
    true,
    new Date("2027-06-30")
  );
  await addGoalContributionIfMissing(p3User.id, p3Emergency.id, 25000, new Date("2026-08-15"), "Safety buffer allocation");
  await addGoalContributionIfMissing(p3User.id, p3Emergency.id, 20000, new Date("2026-09-15"), "Safety buffer allocation");
  await addGoalContributionIfMissing(p3User.id, p3Emergency.id, 15000, new Date("2026-10-15"), "Safety buffer allocation");

  // Budgets for P3 (Aug, Sep, Oct, Nov) - Well-adhered
  for (const m of [8, 9, 10, 11]) {
    await setBudget(p3User.id, rentCat, 35000, m, 2026);
    await setBudget(p3User.id, groceryCat, 20000, m, 2026);
    await setBudget(p3User.id, billsCat, 10000, m, 2026);
    await setBudget(p3User.id, entCat, 15000, m, 2026);
  }

  // Transactions for P3
  // August 2026 (Income 120k, Exp 68k)
  await addTransactionIfMissing(p3User.id, salaryCat, TransactionType.INCOME, 120000, "Monthly Salary Credit - Senior Consultant", new Date("2026-08-01T09:30:00Z"));
  await addTransactionIfMissing(p3User.id, rentCat, TransactionType.EXPENSE, 30000, "Apartment Rent Payment", new Date("2026-08-03T11:00:00Z"));
  await addTransactionIfMissing(p3User.id, groceryCat, TransactionType.EXPENSE, 17000, "Supermarket & Fresh Produce", new Date("2026-08-08T15:00:00Z"));
  await addTransactionIfMissing(p3User.id, billsCat, TransactionType.EXPENSE, 8000, "Electricity & Fiber Internet", new Date("2026-08-11T10:00:00Z"));
  await addTransactionIfMissing(p3User.id, entCat, TransactionType.EXPENSE, 13000, "Weekend Outings & Dining", new Date("2026-08-20T20:00:00Z"));

  // September 2026 (Income 120k, Exp 70k)
  await addTransactionIfMissing(p3User.id, salaryCat, TransactionType.INCOME, 120000, "Monthly Salary Credit - Senior Consultant", new Date("2026-09-01T09:30:00Z"));
  await addTransactionIfMissing(p3User.id, rentCat, TransactionType.EXPENSE, 30000, "Apartment Rent Payment", new Date("2026-09-03T11:00:00Z"));
  await addTransactionIfMissing(p3User.id, groceryCat, TransactionType.EXPENSE, 18000, "Supermarket & Fresh Produce", new Date("2026-09-07T15:30:00Z"));
  await addTransactionIfMissing(p3User.id, billsCat, TransactionType.EXPENSE, 8000, "Electricity & Fiber Internet", new Date("2026-09-10T10:00:00Z"));
  await addTransactionIfMissing(p3User.id, entCat, TransactionType.EXPENSE, 14000, "Weekend Outings & Dining", new Date("2026-09-19T20:30:00Z"));

  // October 2026 (CRITICAL: Income 120k, Rent 30k, Groceries 18k, Bills 8k, Ent 14k -> Total 70k, Target Score: 69)
  await addTransactionIfMissing(p3User.id, salaryCat, TransactionType.INCOME, 120000, "Monthly Salary Credit - Senior Consultant", new Date("2026-10-01T09:30:00Z"));
  await addTransactionIfMissing(p3User.id, rentCat, TransactionType.EXPENSE, 30000, "Apartment Rent Payment", new Date("2026-10-03T11:00:00Z"));
  await addTransactionIfMissing(p3User.id, groceryCat, TransactionType.EXPENSE, 18000, "Supermarket & Fresh Produce", new Date("2026-10-08T15:00:00Z"));
  await addTransactionIfMissing(p3User.id, billsCat, TransactionType.EXPENSE, 8000, "Electricity & Fiber Internet", new Date("2026-10-10T10:00:00Z"));
  await addTransactionIfMissing(p3User.id, entCat, TransactionType.EXPENSE, 14000, "Weekend Outings & Dining", new Date("2026-10-21T20:00:00Z"));

  // November 2026 (through Nov 14)
  await addTransactionIfMissing(p3User.id, salaryCat, TransactionType.INCOME, 120000, "Monthly Salary Credit - Senior Consultant", new Date("2026-11-01T09:30:00Z"));
  await addTransactionIfMissing(p3User.id, rentCat, TransactionType.EXPENSE, 30000, "Apartment Rent Payment", new Date("2026-11-03T11:00:00Z"));
  await addTransactionIfMissing(p3User.id, groceryCat, TransactionType.EXPENSE, 9000, "Supermarket Groceries", new Date("2026-11-07T15:00:00Z"));
  await addTransactionIfMissing(p3User.id, billsCat, TransactionType.EXPENSE, 8000, "Electricity & Fiber Internet", new Date("2026-11-10T10:00:00Z"));

  // -------------------------------------------------------------
  // USER 4: P4 – D Indebted (Target FinScore: 51)
  // -------------------------------------------------------------
  console.log("\n▶ Seeding P4 – D Indebted...");
  const p4User = await seedUser(DEMO_USERS[3]);

  // Holding for P4: Single Fixed Deposit of ₹30,000 (Tax-saver lock-in)
  await getOrCreateHolding(p4User.id, {
    type: HoldingType.FIXED_DEPOSIT,
    name: "SBI 3-Year Tax-Saver FD",
    subType: "TAX_SAVER",
    notes: "Tax Saver Lock-in FD",
    principal: 30000,
    interestRate: 6.80,
    startDate: new Date("2026-02-01T00:00:00Z"),
    maturityDate: new Date("2029-02-01T00:00:00Z"),
    maturityAmount: 36500,
  });

  // Goals for P4 (Emergency fund of ₹15,000 for exact score 51)
  const p4Emergency = await getOrCreateGoal(
    p4User.id,
    "Emergency Reserve Buffer",
    100000,
    true,
    new Date("2027-12-31")
  );
  await addGoalContributionIfMissing(p4User.id, p4Emergency.id, 5000, new Date("2026-08-20"), "Monthly debt buffer");
  await addGoalContributionIfMissing(p4User.id, p4Emergency.id, 5000, new Date("2026-09-20"), "Monthly debt buffer");
  await addGoalContributionIfMissing(p4User.id, p4Emergency.id, 5000, new Date("2026-10-20"), "Monthly debt buffer");

  // Budgets for P4 (Aug, Sep, Oct, Nov) - Includes EMI budget
  for (const m of [8, 9, 10, 11]) {
    await setBudget(p4User.id, emiCat, 25000, m, 2026);
    await setBudget(p4User.id, rentCat, 20000, m, 2026);
    await setBudget(p4User.id, groceryCat, 15000, m, 2026);
    await setBudget(p4User.id, billsCat, 15000, m, 2026);
  }

  // Transactions for P4
  // August 2026 (Income 80k, Exp 71k: EMI 25k, Rent 20k, Groceries 14k, Utilities 12k)
  await addTransactionIfMissing(p4User.id, salaryCat, TransactionType.INCOME, 80000, "Monthly Salary Credit - Operations Lead", new Date("2026-08-01T10:00:00Z"));
  await addTransactionIfMissing(p4User.id, emiCat, TransactionType.EXPENSE, 25000, "HDFC Personal Loan EMI Auto-Debit", new Date("2026-08-02T05:00:00Z"));
  await addTransactionIfMissing(p4User.id, rentCat, TransactionType.EXPENSE, 20000, "House Rent Payment", new Date("2026-08-04T11:00:00Z"));
  await addTransactionIfMissing(p4User.id, groceryCat, TransactionType.EXPENSE, 14000, "Monthly Groceries & Essentials", new Date("2026-08-09T16:00:00Z"));
  await addTransactionIfMissing(p4User.id, billsCat, TransactionType.EXPENSE, 12000, "Electricity, Water & Maintenance Bills", new Date("2026-08-14T12:00:00Z"));

  // September 2026 (Income 80k, Exp 72k: EMI 25k, Rent 20k, Groceries 14k, Utilities 13k)
  await addTransactionIfMissing(p4User.id, salaryCat, TransactionType.INCOME, 80000, "Monthly Salary Credit - Operations Lead", new Date("2026-09-01T10:00:00Z"));
  await addTransactionIfMissing(p4User.id, emiCat, TransactionType.EXPENSE, 25000, "HDFC Personal Loan EMI Auto-Debit", new Date("2026-09-02T05:00:00Z"));
  await addTransactionIfMissing(p4User.id, rentCat, TransactionType.EXPENSE, 20000, "House Rent Payment", new Date("2026-09-04T11:00:00Z"));
  await addTransactionIfMissing(p4User.id, groceryCat, TransactionType.EXPENSE, 14000, "Monthly Groceries & Essentials", new Date("2026-09-08T16:00:00Z"));
  await addTransactionIfMissing(p4User.id, billsCat, TransactionType.EXPENSE, 13000, "Electricity, Water & Maintenance Bills", new Date("2026-09-12T12:00:00Z"));

  // October 2026 (CRITICAL: Income 80k, Exp 72k: EMI 25k, Rent 20k, Groceries 14k, Utilities 13k -> Target Score: 51)
  await addTransactionIfMissing(p4User.id, salaryCat, TransactionType.INCOME, 80000, "Monthly Salary Credit - Operations Lead", new Date("2026-10-01T10:00:00Z"));
  await addTransactionIfMissing(p4User.id, emiCat, TransactionType.EXPENSE, 25000, "HDFC Personal Loan EMI Auto-Debit", new Date("2026-10-02T05:00:00Z"));
  await addTransactionIfMissing(p4User.id, rentCat, TransactionType.EXPENSE, 20000, "House Rent Payment", new Date("2026-10-04T11:00:00Z"));
  await addTransactionIfMissing(p4User.id, groceryCat, TransactionType.EXPENSE, 14000, "Monthly Groceries & Essentials", new Date("2026-10-09T16:00:00Z"));
  await addTransactionIfMissing(p4User.id, billsCat, TransactionType.EXPENSE, 13000, "Electricity, Water & Maintenance Bills", new Date("2026-10-12T12:00:00Z"));

  // November 2026 (through Nov 14)
  await addTransactionIfMissing(p4User.id, salaryCat, TransactionType.INCOME, 80000, "Monthly Salary Credit - Operations Lead", new Date("2026-11-01T10:00:00Z"));
  await addTransactionIfMissing(p4User.id, emiCat, TransactionType.EXPENSE, 25000, "HDFC Personal Loan EMI Auto-Debit", new Date("2026-11-02T05:00:00Z"));
  await addTransactionIfMissing(p4User.id, rentCat, TransactionType.EXPENSE, 20000, "House Rent Payment", new Date("2026-11-04T11:00:00Z"));
  await addTransactionIfMissing(p4User.id, groceryCat, TransactionType.EXPENSE, 7000, "Groceries & Vegetables", new Date("2026-11-07T16:00:00Z"));
  await addTransactionIfMissing(p4User.id, billsCat, TransactionType.EXPENSE, 6000, "Electricity & Internet Bills", new Date("2026-11-10T12:00:00Z"));

  // Sync totalIncome and totalExpense on user model for all 4 users
  for (const u of [p1User, p2User, p3User, p4User]) {
    const txs = await prisma.transaction.findMany({ where: { userId: u.id } });
    const inc = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const exp = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    await prisma.user.update({
      where: { id: u.id },
      data: { totalIncome: inc, totalExpense: exp },
    });
  }

  console.log("\n==================================================");
  console.log("   Verifying October 2026 Health Scores...");
  console.log("==================================================");

  const verificationResults = [];
  for (const cfg of DEMO_USERS) {
    const user = await prisma.user.findUnique({ where: { email: cfg.email } });
    if (!user) continue;

    const res = await healthScoreService.compute(user.id, { month: 10, year: 2026 });
    const isMatch = res.score === cfg.targetScore;
    console.log(
      `  ${isMatch ? "✓" : "✗"} ${cfg.name.padEnd(20)} | Target: ${String(cfg.targetScore).padStart(2)} | Actual: ${String(res.score).padStart(2)} | Rating: ${res.rating}`
    );
    verificationResults.push({
      name: cfg.name,
      email: cfg.email,
      target: cfg.targetScore,
      actual: res.score,
      match: isMatch,
      breakdown: res.breakdown,
    });
  }

  return verificationResults;
}

if (require.main === module) {
  seedDemoUsers()
    .then((results) => {
      console.log("\nSeeding completed successfully.");
      const allPassed = results.every((r) => r.match);
      if (allPassed) {
        console.log("🎉 ALL 4 DEMO USERS MATCH EXACT TARGET SCORES!");
        process.exit(0);
      } else {
        console.error("⚠️ Some scores did not match targets. Inspect output above.");
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("❌ Seeding failed with error:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

