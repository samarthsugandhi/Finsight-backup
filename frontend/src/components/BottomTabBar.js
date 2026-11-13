"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  PieChart,
  MoreHorizontal,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  HeartPulse,
  BarChart3,
  FileText,
  FileUp,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo";

/* Primary 5 tabs shown in the bar */
const PRIMARY_TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "finai", label: "FinAI", icon: Sparkles, isFinAI: true },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
  { label: "More", icon: MoreHorizontal, isMore: true },
];

/* Full nav for the "More" drawer */
const MORE_ITEMS = [
  { href: "/dashboard/income", label: "Income", icon: TrendingUp },
  { href: "/dashboard/expenses", label: "Expenses", icon: TrendingDown },
  { href: "/dashboard/budgets", label: "Budgets", icon: Wallet },
  { href: "/dashboard/goals", label: "Savings Goals", icon: Target },
  { href: "/dashboard/financial-health", label: "FinScore", icon: HeartPulse },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/bank-statements", label: "Bank Statements", icon: FileUp },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname, href, exact) {
  if (!href) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [finaiOpen, setFinaiOpen] = useState(false);

  useEffect(() => {
    const handleState = (e) => {
      if (e.detail && typeof e.detail.open === "boolean") {
        setFinaiOpen(e.detail.open);
      }
    };
    window.addEventListener("finsight:finai-state", handleState);
    return () => window.removeEventListener("finsight:finai-state", handleState);
  }, []);

  /* Which "More" items are active (to highlight the More tab itself) */
  const moreActive = MORE_ITEMS.some((i) => isActive(pathname, i.href, false));

  return (
    <>
      {/* Fixed bottom bar — only visible on <lg screens */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-line bg-paper-raised/95 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Bottom navigation"
      >
        <div className="flex items-stretch justify-around">
          {PRIMARY_TABS.map((tab) => {
            if (tab.isFinAI) {
              const active = finaiOpen;
              return (
                <button
                  key="finai"
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    window.dispatchEvent(new CustomEvent("finsight:toggle-finai"));
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] flex-1 py-2 text-[10px] font-semibold transition-colors relative cursor-pointer ${
                    active ? "text-horizon font-bold" : "text-ink-soft hover:text-ink"
                  }`}
                  aria-label="Open FinAI chat with local Ollama"
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-tab-indicator"
                      className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-horizon"
                    />
                  )}
                  <tab.icon className={`h-5 w-5 shrink-0 ${active ? "text-horizon" : ""}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            }

            if (tab.isMore) {
              const active = moreOpen || moreActive;
              return (
                <button
                  key="more"
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] flex-1 py-2 text-[10px] font-semibold transition-colors ${
                    active ? "text-horizon" : "text-ink-soft"
                  }`}
                  aria-label="More navigation"
                  aria-expanded={moreOpen}
                >
                  <tab.icon className="h-5 w-5 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            }

            const active = isActive(pathname, tab.href, tab.exact);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[56px] flex-1 py-2 text-[10px] font-semibold transition-colors relative ${
                  active ? "text-horizon" : "text-ink-soft"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-tab-indicator"
                    className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-horizon"
                  />
                )}
                <tab.icon className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* "More" full-screen drawer */}
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 rounded-t-3xl bg-paper-raised border-t border-line shadow-2xl overflow-hidden"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-line opacity-60" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <Logo className="h-6 w-6" />
                  <span className="font-screamer text-lg tracking-widest text-horizon">FinSight</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-full text-ink-soft hover:bg-ink/5 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* More nav links */}
              <nav className="px-4 py-3 grid grid-cols-3 gap-2">
                {MORE_ITEMS.map((item) => {
                  const active = isActive(pathname, item.href, false);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-xs font-semibold text-center transition-all ${
                        active
                          ? "bg-horizon/15 text-horizon"
                          : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

