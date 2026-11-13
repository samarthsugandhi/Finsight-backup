"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import BottomTabBar from "@/components/BottomTabBar";
import { FinanceProvider } from "@/context/FinanceContext";
import FinAIChat from "@/components/FinAIChat";
import ModuleGuideButton from "@/components/ModuleGuideButton";

export default function DashboardLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ProtectedRoute>
      <FinanceProvider>
        <div className="flex min-h-screen bg-paper">
          {/* Desktop sidebar — hidden on mobile */}
          <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

          {/* Main content column */}
          <div className="flex min-h-screen flex-1 flex-col min-w-0">
            <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
            {/*
              pb-28 on mobile leaves room above the bottom tab bar (56px) + safe-area.
              sm:pb-32 gives a bit more breathing room on larger phones.
              lg:pb-10 reverts to normal padding once the sidebar is visible.
            */}
            <main className="flex-1 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-10">{children}</main>
          </div>
        </div>

        {/* Mobile bottom navigation — rendered at document level, hidden lg+ */}
        <BottomTabBar />

        {/* Global — available on every dashboard page */}
        <FinAIChat />
        <ModuleGuideButton />
      </FinanceProvider>
    </ProtectedRoute>
  );
}
