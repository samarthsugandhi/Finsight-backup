"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  HelpCircle,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  ListOrdered,
  Info,
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PieChart,
  HeartPulse,
  BarChart3,
  FileText,
  Settings,
  FileUp,
  MessageSquare,
} from "lucide-react";

// ── Module guide data ─────────────────────────────────────────────────────────

const MODULE_GUIDES = {
  "/dashboard": {
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Your real-time financial command center",
    overview:
      "The Dashboard consolidates your complete financial picture — income, expenses, savings, net worth, investments, and FinScore — in one dynamic view. All cards respond to the Period Selector at the top.",
    features: [
      {
        heading: "Period Selector",
        detail:
          "Switch between Monthly, Yearly, and All Time modes. Every stat card, chart, and transaction list reacts instantly.",
      },
      {
        heading: "Stat Cards",
        detail:
          "Top-row cards show Total Income, Total Expenses, Net Savings, Net Worth, and your current FinScore at a glance.",
      },
      {
        heading: "Spending by Category",
        detail:
          "Pie and bar charts break down expense distribution across categories such as Food, Rent, Transport, and Bills.",
      },
      {
        heading: "Recent Transactions",
        detail:
          "Quick view of the latest financial entries with amount, category, and date. Click any row to see full details.",
      },
      {
        heading: "Investments Summary",
        detail:
          "Current portfolio value and total gain/loss pulled live from the Investments module.",
      },
      {
        heading: "FinScore Strip",
        detail:
          "Compact five-pillar breakdown showing which health factors are strong and which need attention.",
      },
    ],
    steps: [
      "Open the Dashboard at /dashboard.",
      "Use the Period Selector to choose the month or year you want to review.",
      "Read the Stat Cards for instant income, expense, and savings totals.",
      "Examine the Spending by Category charts to spot high-spend areas.",
      "Scroll down to review Recent Transactions and the Investments summary.",
      "Click FinScore to deep-dive into your five-pillar health breakdown.",
    ],
    tips: "Bookmark the Dashboard as your daily starting point. Reviewing it at the beginning of each month helps you catch overspending before it compounds.",
  },

  "/dashboard/transactions": {
    icon: ArrowLeftRight,
    title: "All Transactions",
    subtitle: "Your complete financial ledger",
    overview:
      "Every income and expense entry you have ever recorded is here. Powerful search, filter, and sort controls let you find any transaction in seconds.",
    features: [
      {
        heading: "Period Selector",
        detail: "Filter the ledger to a specific month, full year, or all time.",
      },
      {
        heading: "Live Search",
        detail: "Type any word to instantly filter by description or category name.",
      },
      {
        heading: "Type & Category Filters",
        detail:
          "Narrow results to Income or Expense, then optionally filter by a specific category.",
      },
      {
        heading: "Sort Controls",
        detail:
          "Sort by Date (newest/oldest) or Amount (highest/lowest) to surface the entries you care about.",
      },
      {
        heading: "Inline Edit & Delete",
        detail:
          "Click the Edit button on any row to update description, amount, category, or date. Delete removes it immediately.",
      },
      {
        heading: "Add Transaction",
        detail:
          "Use the Add button (or FinAI voice command) to record a new income or expense entry.",
      },
    ],
    steps: [
      "Navigate to Transactions from the sidebar.",
      "Pick a period with the Period Selector.",
      "Type a keyword in the Search box to find a specific transaction.",
      "Use Type and Category dropdowns to narrow the view.",
      "Click Edit on any row to fix a description, amount, or category.",
      "Use Add Transaction to record a new entry manually.",
    ],
    tips: "Keeping descriptions short but meaningful (e.g., 'Swiggy dinner', 'SBI loan EMI') makes search much faster and helps FinAI give you better spending insights.",
  },

  "/dashboard/income": {
    icon: TrendingUp,
    title: "Income",
    subtitle: "Track every money inflow",
    overview:
      "A filtered view of all INCOME-type transactions — Salary, Freelance, Business, Investment Returns, Gifts, and Interest. The layout and controls mirror the full Transactions page.",
    features: [
      {
        heading: "Period Selector",
        detail: "Inspect income for a specific month or full year.",
      },
      {
        heading: "Total Income Card",
        detail: "Running total of all income in the selected period.",
      },
      {
        heading: "Category Breakdown",
        detail: "See which income stream contributes most.",
      },
      {
        heading: "Add Income",
        detail: "Record a new income entry directly from this page.",
      },
    ],
    steps: [
      "Open Income from the Transactions group in the sidebar.",
      "Set the period to the month or year you want to analyse.",
      "Review the Total Income card and category breakdown.",
      "Click Add Income to record a salary payment, freelance receipt, or other inflow.",
    ],
    tips: "Log salary payments on the same day each month. Consistent categorisation makes FinAI analysis and health score calculations far more accurate.",
  },

  "/dashboard/expenses": {
    icon: TrendingDown,
    title: "Expenses",
    subtitle: "Track every money outflow",
    overview:
      "A filtered view of all EXPENSE-type transactions — Rent, Food, Transport, Bills, Shopping, Health, and others. Identical controls to the Income page but focused solely on spending.",
    features: [
      {
        heading: "Period Selector",
        detail: "Monitor spending for a specific month or entire year.",
      },
      {
        heading: "Total Expenses Card",
        detail: "Running total of all expenses in the selected period.",
      },
      {
        heading: "Top Category Highlight",
        detail: "Instantly see your single largest spending category.",
      },
      {
        heading: "Add Expense",
        detail: "Log a new spend directly from this page.",
      },
    ],
    steps: [
      "Open Expenses from the Transactions group in the sidebar.",
      "Pick the period to review.",
      "Check which category is consuming the most budget.",
      "Add any missing expense entries using the Add Expense button.",
    ],
    tips: "Review this page weekly rather than monthly. Catching an overspend mid-month gives you time to adjust before the period closes.",
  },

  "/dashboard/budgets": {
    icon: Wallet,
    title: "Budgets",
    subtitle: "Cap monthly spending per category",
    overview:
      "Set a monthly spending limit for each expense category. FinSight compares your actual spend to each limit and flags overruns in real time. Budget discipline contributes 20% of your FinScore.",
    features: [
      {
        heading: "Monthly & Yearly Modes",
        detail:
          "Switch between monthly limit vs. monthly actual, or aggregate yearly limits vs. annual totals.",
      },
      {
        heading: "Status Badges",
        detail:
          "WITHIN BUDGET (green) or EXCEEDED (red) badges show at a glance which categories are on track.",
      },
      {
        heading: "Progress Bars",
        detail: "Visual fill shows how much of each limit has been consumed.",
      },
      {
        heading: "Set / Update Limits",
        detail:
          "Use the form at the bottom of each category row to allocate or update a monthly limit.",
      },
      {
        heading: "Delete Budget",
        detail: "Remove a limit from any category with the trash icon.",
      },
    ],
    steps: [
      "Navigate to Budgets in the sidebar.",
      "Pick the month and year you want to configure.",
      "For each expense category, enter a monthly limit in the input field and confirm.",
      "Review the status badges — green means on track, red means you have already exceeded the limit.",
      "Adjust limits any time by entering a new amount for that category.",
    ],
    tips: "Start with your top three expense categories (usually Rent, Food, and Transport). Even rough limits dramatically improve your FinScore Budget Discipline pillar.",
  },

  "/dashboard/goals": {
    icon: Target,
    title: "Savings Goals",
    subtitle: "Plan and track financial milestones",
    overview:
      "Define named savings goals — Emergency Fund, Vacation, Laptop, House Down Payment — set a target amount and date, then allocate portions of your surplus savings each month.",
    features: [
      {
        heading: "Create a Goal",
        detail: "Name your goal, set a target amount, and optionally set a deadline date.",
      },
      {
        heading: "Progress Bar",
        detail: "Visual percentage fill shows how close you are to the target.",
      },
      {
        heading: "Allocate Savings",
        detail:
          "Each month, enter an amount to contribute. Contributions are logged with date and optional note.",
      },
      {
        heading: "Contribution History",
        detail: "Expand any goal to view the full allocation history with dates and amounts.",
      },
      {
        heading: "Emergency Fund Tag",
        detail:
          "Mark one goal as your Emergency Fund. This directly feeds the Emergency Fund Coverage pillar of your FinScore.",
      },
    ],
    steps: [
      "Open Goals from the sidebar.",
      "Click Add Goal, enter a name, target amount, and optional deadline.",
      "Each month, enter your contribution amount in the goal card and save.",
      "Expand contribution history to verify past allocations.",
      "Mark your most important goal as Emergency Fund if applicable.",
    ],
    tips: "An Emergency Fund goal is mandatory for the best FinScore. Aim for 3–6 months of expenses. Even ₹5,000 added monthly compounds quickly toward that target.",
  },

  "/dashboard/portfolio": {
    icon: PieChart,
    title: "Investments",
    subtitle: "Multi-asset portfolio management & beginner-friendly investment planner",
    overview:
      "Manage your active holdings in My Portfolio with running weighted-average cost accounting and statement imports. Explore tailored options in Investment Planner, or compute precision compound interest returns using the FD Calculator.",
    features: [
      {
        heading: "My Portfolio (40% Navigation)",
        detail:
          "Track Stocks, Mutual Funds, Gold, and Fixed Deposits. View your total cost basis, current market value, and unrealized gain/loss strictly for priced assets.",
      },
      {
        heading: "Investment Planner (40% Navigation)",
        detail:
          "Select your Risk Level, enter an Investment Amount, and pick a Duration (< 1 yr, 1–3 yrs, 3–5 yrs, 5+ yrs) to evaluate 3–4 transparent options.",
      },
      {
        heading: "FD Calculator (20% Navigation)",
        detail:
          "Precision compound interest calculator: deposit sum, interest rate, duration (years & months), and compounding frequency (Quarterly, Monthly, Half-yearly, Yearly).",
      },
      {
        heading: "Record BUY / SELL Trades",
        detail:
          "Log buys and partial sells. FinSight uses running WAVAC (weighted average cost) accounting to compute exact cost basis and realized capital gains.",
      },
      {
        heading: "Valuation & Unpriced Disclosures",
        detail:
          "Update current valuations manually or via statement import. Holdings awaiting prices are clearly labeled 'Price not added' and never distorted into losses.",
      },
      {
        heading: "Portfolio Analytics & Performance",
        detail:
          "View asset allocation donuts, capital comparison charts, and an Investment Performance breakdown showing returns per holding.",
      },
    ],
    steps: [
      "Open Investments from the sidebar navigation.",
      "Switch between My Portfolio, Investment Planner, and FD Calculator using the 40:40:20 navigation cards.",
      "In My Portfolio, click Add Asset or Import Investment Statements to log your investments.",
      "Click Trade on any holding to record BUY or SELL transactions with automated cost basis updates.",
      "In FD Calculator, enter deposit sum, interest rate, and duration to compute maturity amounts using standard compound interest.",
      "In Investment Planner, discover 3–4 tailored options matching your specific risk preference and timeframe.",
    ],
    tips: "For short durations under 1 year, capital preservation is paramount — equities are unsuitable for near-term money. For 5+ year horizons, diversified equity mutual funds provide compounding potential to beat inflation.",
  },

  "/dashboard/financial-health": {
    icon: HeartPulse,
    title: "FinScore",
    subtitle: "100-point composite financial wellness score",
    overview:
      "FinScore is a weighted algorithm evaluating five pillars of financial health. It gives you a single number from 0 to 100 so you always know your overall financial wellness at a glance.",
    features: [
      {
        heading: "Savings Rate (30%)",
        detail: "What percentage of your income do you save? Higher savings rate = higher score.",
      },
      {
        heading: "Budget Discipline (20%)",
        detail: "Are you staying within your set category budgets? Overruns pull this pillar down.",
      },
      {
        heading: "Diversification (20%)",
        detail:
          "How spread are your investments across asset types? One asset class = low score.",
      },
      {
        heading: "Emergency Fund Coverage (20%)",
        detail:
          "How many months of expenses does your Emergency Fund cover? 3+ months = full score.",
      },
      {
        heading: "Debt Ratio (10%)",
        detail: "Ratio of total debt transactions to assets. Requires debt entries to activate.",
      },
      {
        heading: "Three View Modes",
        detail:
          "Monthly (selected month's pillar scores), Weekly Monitoring (7-day trend), and Yearly Progress (12-month timeline).",
      },
    ],
    steps: [
      "Navigate to FinScore in the sidebar.",
      "Select Monthly, Weekly, or Yearly view mode.",
      "Pick the month and year to calculate.",
      "Read each pillar's score and contribution to understand what is dragging the overall score.",
      "Click the info icon (ⓘ) next to any pillar for a plain-language explanation.",
      "Take the recommended action (e.g., set an Emergency Fund goal, add a budget limit) to raise a weak pillar.",
    ],
    tips: "Savings Rate carries 30% of the score — the single biggest lever. Even raising your savings rate from 10% to 20% can move the overall FinScore by 10–15 points.",
  },

  "/dashboard/analytics": {
    icon: BarChart3,
    title: "Analytics",
    subtitle: "Visual trends and historical data analysis",
    overview:
      "Deep visual charts for category spending distribution, cash flow trends over time, budget utilisation, and investment allocation. Use Analytics for pattern discovery rather than point-in-time review.",
    features: [
      {
        heading: "Category Breakdown",
        detail:
          "Toggle between Pie and Bar chart views. Switch Data Type between Expenses and Income to see distribution for either.",
      },
      {
        heading: "Cash Flow Trend",
        detail:
          "Line chart showing monthly Income, Expenses, and Net Savings side-by-side across the selected year.",
      },
      {
        heading: "Budget Utilisation",
        detail:
          "Stacked visual comparing your monthly limit to actual spend per category.",
      },
      {
        heading: "Investment Allocation",
        detail: "Donut chart mirroring the portfolio breakdown from the Investments module.",
      },
      {
        heading: "Period Selector",
        detail: "All charts respond to Monthly, Yearly, or All Time mode.",
      },
    ],
    steps: [
      "Navigate to Analytics in the sidebar.",
      "Set the period to the month or year you want to analyse.",
      "Review the Category Breakdown — toggle Pie/Bar and switch between Expenses and Income.",
      "Scroll to the Cash Flow Trend chart to spot months with negative savings.",
      "Check Budget Utilisation to identify consistently over-budget categories.",
    ],
    tips: "The Cash Flow Trend is the most powerful chart on this page. A widening gap between Income and Expense lines signals improving financial health; a narrowing gap is an early warning sign.",
  },

  "/dashboard/reports": {
    icon: FileText,
    title: "Reports",
    subtitle: "Consolidated financial statements and exports",
    overview:
      "An all-in-one financial report covering income, expenses, savings, FinScore, budget adherence, goals progress, and portfolio value. Download as PDF or CSV for record-keeping, taxes, or sharing with an advisor.",
    features: [
      {
        heading: "Period Selector",
        detail: "Generate reports for a specific month, full year, or all time.",
      },
      {
        heading: "Executive Financial Summary",
        detail:
          "Top-level numbers: total income, expenses, net savings, savings rate, and score.",
      },
      {
        heading: "Category Spending Charts",
        detail:
          "Bar chart and pie chart of expense distribution included in the on-screen report.",
      },
      {
        heading: "Budget Summary Table",
        detail:
          "Every category's monthly limit, actual spend, and over/under status in one table.",
      },
      {
        heading: "Goals Progress",
        detail: "Current amount saved vs. target for each active goal.",
      },
      {
        heading: "PDF / CSV Export",
        detail:
          "Download the full report as a formatted PDF or a raw CSV spreadsheet for further analysis.",
      },
    ],
    steps: [
      "Navigate to Reports in the sidebar.",
      "Select the period (month, year, or all time).",
      "Review the on-screen Executive Summary and charts.",
      "Scroll through Budget Summary and Goals Progress sections.",
      "Click Download PDF to save a formatted report, or Download CSV to export raw data.",
    ],
    tips: "Run an end-of-year report every December. It gives you a clean financial summary for tax filing, and comparing year-over-year reports shows how your finances are trending.",
  },

  "/dashboard/bank-statements": {
    icon: FileUp,
    title: "Bank Statement Import",
    subtitle: "Bulk-import transactions from PDF bank statements",
    overview:
      "Upload a PDF bank statement from any Indian bank. FinSight's server-side parser extracts transaction text, matches descriptions against your saved categorisation rules, and routes unknown vendors to a Review Queue for one-click approval.",
    features: [
      {
        heading: "PDF Upload",
        detail:
          "Drag-and-drop or browse to upload a bank statement PDF. All major Indian bank formats are supported.",
      },
      {
        heading: "Auto-Categorisation",
        detail:
          "Descriptions are matched against your saved vendor rules. Known merchants are categorised and imported automatically.",
      },
      {
        heading: "Review Queue",
        detail:
          "Transactions with unrecognised descriptions appear here. Review each one, pick a category, and approve — or reject — in a single click.",
      },
      {
        heading: "Bulk Approve",
        detail:
          "After categorising all queued items, click Approve All to add them to your ledger in one action.",
      },
      {
        heading: "Dashboard Sync",
        detail:
          "Once the queue is cleared, all dashboard charts, the FinScore, and analytics update automatically.",
      },
    ],
    steps: [
      "Navigate to Bank Statements in the sidebar.",
      "Click Upload PDF or drag a statement file onto the upload card.",
      "Wait for the parser to extract transactions (usually a few seconds).",
      "Scroll down to the Review Queue — categorise any unrecognised entries.",
      "Click Approve All to commit the transactions to your ledger.",
      "The dashboard refreshes automatically with the new data.",
    ],
    tips: "Upload statements regularly (monthly) rather than in bulk once a year. Smaller batches keep the Review Queue short and categories accurate.",
  },

  "/dashboard/settings": {
    icon: Settings,
    title: "Settings",
    subtitle: "Account, security, appearance, and preferences",
    overview:
      "Manage your FinSight account from one place — update your profile name, change your password securely, switch between light and dark themes, and sign out.",
    features: [
      {
        heading: "Profile Information",
        detail:
          "View your initials avatar, full name, registered email (read-only), and member-since date.",
      },
      {
        heading: "Edit Name",
        detail:
          "Click Edit Name, type your updated display name, and save. The name updates immediately everywhere in the app.",
      },
      {
        heading: "Change Password",
        detail:
          "Enter your current password, new password, and confirmation. FinSight verifies the current password on the backend before updating.",
      },
      {
        heading: "Appearance",
        detail:
          "Toggle between Light and Dark themes. The preference is saved and applied instantly across all pages.",
      },
      {
        heading: "Account Actions",
        detail:
          "Sign out of your session securely. A confirmation step prevents accidental sign-outs.",
      },
    ],
    steps: [
      "Open Settings from the bottom of the sidebar.",
      "To rename yourself: click Edit Name, enter the new name, then click Save.",
      "To change your password: fill in Current Password, New Password, and Confirm Password, then submit.",
      "To switch theme: click the Light or Dark toggle in the Appearance section.",
      "To sign out: click Log Out and confirm.",
    ],
    tips: "Your Gmail address is permanently linked to your account and cannot be changed through Settings. Use a strong, unique password and update it if you suspect any unauthorised access.",
  },
};

// Fallback for unknown routes
const DEFAULT_GUIDE = {
  icon: HelpCircle,
  title: "FinSight Help",
  subtitle: "Navigate to any module to see its guide",
  overview:
    "Open any page from the sidebar and click this button to see a contextual guide for that module.",
  features: [
    { heading: "Dashboard", detail: "Real-time financial overview." },
    { heading: "Transactions / Income / Expenses", detail: "Full transaction ledger." },
    { heading: "Budgets", detail: "Monthly spending limits per category." },
    { heading: "Savings Goals", detail: "Track progress toward financial milestones." },
    { heading: "Investments", detail: "Multi-asset portfolio tracker." },
    { heading: "FinScore", detail: "100-point composite health score." },
    { heading: "Analytics", detail: "Trend charts and spending analysis." },
    { heading: "Reports", detail: "Exportable financial statements." },
    { heading: "Bank Statements", detail: "Bulk-import from PDF statements." },
    { heading: "Settings", detail: "Profile, password, theme." },
  ],
  steps: ["Click any item in the sidebar to open that module.", "Then click this ? button for the module's specific guide."],
  tips: "FinAI (the sparkles button at the bottom-right) can answer questions about any module in natural language — just ask!",
};

// ── Route matcher ────────────────────────────────────────────────────────────

function resolveGuide(pathname) {
  if (!pathname) return DEFAULT_GUIDE;
  // Exact match first
  if (MODULE_GUIDES[pathname]) return MODULE_GUIDES[pathname];
  // Prefix match — longest wins
  const prefix = Object.keys(MODULE_GUIDES)
    .filter((k) => pathname.startsWith(k + "/") || pathname === k)
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? MODULE_GUIDES[prefix] : DEFAULT_GUIDE;
}

// ── Animations ───────────────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
  exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.15 } },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ModuleGuideButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const guide = resolveGuide(pathname);
  const GuideIcon = guide.icon || HelpCircle;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Listen for programmatic guide open events from metric tooltips
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("finsight:open-guide", handleOpen);
    return () => window.removeEventListener("finsight:open-guide", handleOpen);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Auto-focus close button when modal opens
  useEffect(() => {
    if (open && closeRef.current) {
      setTimeout(() => closeRef.current?.focus(), 60);
    }
  }, [open]);

  return (
    <>
      {/* ── Floating trigger button ── */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        title={`Open ${guide.title} guide`}
        aria-label={`Open ${guide.title} guide`}
        className="fixed bottom-6 left-6 lg:left-72 z-40 h-11 w-11 rounded-full bg-paper-raised border border-horizon/40 text-horizon shadow-lg hover:shadow-horizon/20 hover:border-horizon/70 hover:bg-horizon/10 transition-all duration-200 flex items-center justify-center cursor-pointer select-none group"
        style={{ willChange: "transform" }}
      >
        <span className="font-screamer text-xl font-bold tracking-tight pointer-events-none leading-none">?</span>

        {/* Tooltip */}
        <span
          className="absolute bottom-full mb-2.5 left-0 hidden group-hover:block whitespace-nowrap rounded-lg bg-ink/90 px-2.5 py-1.5 text-[11px] text-paper font-editorial shadow-lg pointer-events-none"
        >
          {guide.title} guide
        </span>
      </motion.button>

      {/* ── Guide modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="guide-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              key="guide-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-title"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-paper border border-line rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="shrink-0 px-5 py-4 border-b border-line flex items-start justify-between gap-3 bg-paper-raised">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-horizon/12 border border-horizon/25 flex items-center justify-center text-horizon">
                    <GuideIcon className="h-4.5 w-4.5" style={{ width: "18px", height: "18px" }} />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="guide-title"
                      className="font-screamer text-lg text-ink uppercase tracking-wide leading-tight truncate"
                    >
                      {guide.title}
                    </h2>
                    <p className="text-[11px] text-ink-soft mt-0.5 font-editorial truncate">{guide.subtitle}</p>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label="Close guide"
                  className="shrink-0 mt-0.5 rounded-lg p-1.5 text-ink-soft hover:text-ink hover:bg-ink/8 transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" style={{ width: "18px", height: "18px" }} />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 font-editorial text-xs leading-relaxed text-ink">

                {/* Overview */}
                <div className="flex items-start gap-2.5 rounded-xl border border-horizon/20 bg-horizon/8 px-4 py-3.5">
                  <Sparkles className="h-4 w-4 text-horizon shrink-0 mt-0.5" />
                  <p className="text-ink font-medium leading-snug">{guide.overview}</p>
                </div>

                {/* Features */}
                {guide.features?.length > 0 && (
                  <section>
                    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
                      <CheckCircle2 className="h-3.5 w-3.5 text-horizon" />
                      Features &amp; Controls
                    </p>
                    <ul className="space-y-2.5">
                      {guide.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-horizon" />
                          <span>
                            <span className="font-semibold text-ink">{f.heading}: </span>
                            <span className="text-ink-soft">{f.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* How to Use */}
                {guide.steps?.length > 0 && (
                  <section>
                    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-soft">
                      <ListOrdered className="h-3.5 w-3.5 text-horizon" />
                      How to Use
                    </p>
                    <ol className="space-y-2">
                      {guide.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-horizon/15 border border-horizon/25 text-[9px] font-bold text-horizon font-screamer leading-none">
                            {idx + 1}
                          </span>
                          <span className="text-ink-soft pt-0.5">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {/* Pro Tip */}
                {guide.tips && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-line bg-paper-raised px-4 py-3.5">
                    <Lightbulb className="h-4 w-4 text-horizon shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-horizon mb-1">
                        Pro Tip
                      </span>
                      <p className="text-ink-soft leading-snug">{guide.tips}</p>
                    </div>
                  </div>
                )}

                {/* FinAI nudge */}
                <div className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-paper px-4 py-3">
                  <MessageSquare className="h-3.5 w-3.5 text-ink-soft shrink-0 mt-0.5" />
                  <p className="text-ink-soft text-[11px]">
                    Need more help?{" "}
                    <span className="font-semibold text-horizon">Ask FinAI</span>
                    {" "}— double-click the sparkles button to chat with your AI financial companion.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-5 py-3.5 border-t border-line bg-paper-raised flex items-center justify-between gap-3">
                <span className="text-[10px] text-ink-soft font-editorial">
                  FinSight · Module Guide
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-horizon px-4 py-1.5 text-[11px] font-screamer font-bold uppercase tracking-wide text-[#0f1b33] hover:bg-horizon/90 active:scale-95 transition-all cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
