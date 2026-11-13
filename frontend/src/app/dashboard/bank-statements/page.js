"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileSearch } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { PageHeader } from "@/components/ui";
import StatementUploader from "@/components/StatementUploader";
import ReviewQueue from "@/components/ReviewQueue";

export default function BankStatementsPage() {
  const { categories, refetch } = useFinance();
  const [uploadKey, setUploadKey] = useState(0);
  const reviewQueueRef = useRef(null);

  /**
   * Called after a successful PDF upload.
   * Scroll down to the Review Queue so the user sees the new items.
   */
  const handleProcessed = () => {
    setUploadKey((k) => k + 1); // force ReviewQueue to re-fetch
    setTimeout(() => {
      reviewQueueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  /**
   * Called when the last Review Queue item is approved.
   * Triggers a full dashboard refetch so charts & health score update instantly.
   */
  const handleQueueEmpty = () => {
    refetch();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page header */}
      <PageHeader
        title="Bank Statement Import"
        description="Upload a PDF statement from any bank. Transactions are auto-categorized using your saved rules; unknown vendors land in the Review Queue below."
        action={
          <div className="flex items-center gap-2 rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-soft">
            <FileSearch className="h-3.5 w-3.5 text-horizon" />
            <span>Supports all bank formats</span>
          </div>
        }
      />

      {/* Upload card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className="mb-10 rounded-2xl border border-line bg-paper-raised p-6 shadow-sm"
      >
        <h2 className="mb-4 font-screamer text-lg tracking-wide text-ink">
          1. Upload PDF Statement
        </h2>
        <StatementUploader onProcessed={handleProcessed} />
      </motion.section>

      {/* How it works — subtle callout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-ink-soft"
      >
        {[
          { step: "01", title: "Extract", desc: "Raw text pulled from your PDF using the server-side parser" },
          { step: "02", title: "Match Rules", desc: "Descriptions matched against your saved vendor rules" },
          { step: "03", title: "Review", desc: "Unknown vendors queue here for a one-click categorization" },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-paper-raised px-3 py-4"
          >
            <span className="font-figure text-lg font-semibold text-horizon">{step}</span>
            <span className="font-semibold text-ink">{title}</span>
            <span className="font-editorial leading-relaxed">{desc}</span>
          </div>
        ))}
      </motion.div>

      {/* PDF Import tips — high-visibility instruction panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "tween" }}
        className="mb-8 overflow-hidden rounded-2xl border border-horizon/50 shadow-lg shadow-horizon/10"
      >
        {/* Header strip */}
        <div className="flex items-center gap-3 bg-horizon px-5 py-3.5">
          <span className="text-xl">📋</span>
          <div>
            <p className="font-screamer text-sm uppercase tracking-widest text-[#0f1b33]">
              How to get the most out of PDF Import
            </p>
            <p className="font-editorial text-[11px] text-[#0f1b33]/70">
              Read this once — it saves you hours of manual sorting
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="bg-gradient-to-b from-horizon/8 to-transparent px-5 py-5 space-y-4">
          <p className="font-editorial text-sm text-ink-soft leading-relaxed border-l-2 border-horizon/50 pl-3">
            Finsight reads your <span className="font-semibold text-ink">transaction descriptions</span> to sort your spending instantly. The better your descriptions, the less you have to do manually.
          </p>

          {/* Tip 1 */}
          <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-paper-raised p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-horizon text-[#0f1b33] text-[11px] font-bold">1</span>
            <div>
              <p className="font-semibold text-sm text-ink mb-0.5">Net Banking Transfers</p>
              <p className="font-editorial text-sm text-ink-soft leading-relaxed">
                Select the appropriate category during the transfer if your bank allows it.
              </p>
            </div>
          </div>

          {/* Tip 2 — highlighted */}
          <div className="flex items-start gap-3 rounded-xl border border-horizon/40 bg-horizon/8 p-4 ring-1 ring-horizon/20">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-horizon text-[#0f1b33] text-[11px] font-bold">2</span>
            <div>
              <p className="font-semibold text-sm text-ink mb-0.5">
                UPI Payments
                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-horizon bg-horizon/15 px-1.5 py-0.5 rounded">Most Important</span>
              </p>
              <p className="font-editorial text-sm text-ink-soft leading-relaxed">
                Always type a short message when paying via GPay, PhonePe, or Paytm. This guarantees accurate, automatic categorization without any manual review!
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {["Dinner", "Electricity Bill", "Petrol", "Rent", "Groceries"].map((ex) => (
                  <span key={ex} className="inline-flex items-center rounded-full bg-horizon/20 px-2.5 py-1 text-[11px] font-bold text-horizon ring-1 ring-horizon/30">
                    &quot;{ex}&quot;
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <p className="font-editorial text-[11px] text-ink-soft text-center pt-1">
            ✨ One habit · Zero manual effort · Perfect categorization
          </p>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="horizon-rule mb-8" />

      {/* Review Queue */}
      <motion.section
        ref={reviewQueueRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 32, delay: 0.1 }}
        className="rounded-2xl border border-line bg-paper-raised p-6 shadow-sm"
        id="review-queue-section"
      >
        <ReviewQueue
          key={uploadKey}
          categories={categories ?? []}
          onQueueEmpty={handleQueueEmpty}
        />
      </motion.section>
    </div>
  );
}
