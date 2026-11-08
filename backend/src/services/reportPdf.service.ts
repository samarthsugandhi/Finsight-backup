import PDFDocument from "pdfkit";
import { ReportData, ReportTransactionItem } from "./report.service";

function fmtCurrency(amount: number): string {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return `${isNeg ? "-" : ""}Rs. ${formatted}`;
}

export const reportPdfService = {
  /**
   * Generates a print-quality financial report PDF buffer.
   */
  async generatePdf(
    report: ReportData,
    contentMode: "summary" | "detailed" | "transactions",
    allTransactions: ReportTransactionItem[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width - 80; // 595.28 - 80 = 515.28
      let y = 40;

      // ─────────────────────────────────────────────────────────────
      // 1. HEADER & BRANDING
      // ─────────────────────────────────────────────────────────────
      doc.rect(40, y, pageWidth, 55).fill("#0B0F19");

      doc.fillColor("#FFFFFF").fontSize(18).font("Helvetica-Bold");
      doc.text("FINSIGHT", 55, y + 14);

      doc.fillColor("#94A3B8").fontSize(9).font("Helvetica");
      doc.text("FINANCIAL INTELLIGENCE & PERFORMANCE AUDIT", 55, y + 34);

      doc.fillColor("#E2E8F0").fontSize(9).font("Helvetica-Bold");
      doc.text(report.periodLabel.toUpperCase(), 40, y + 15, { align: "right", width: pageWidth - 15 });

      doc.fillColor("#94A3B8").fontSize(8).font("Helvetica");
      doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • Currency: ${report.currency}`, 40, y + 34, { align: "right", width: pageWidth - 15 });

      y += 70;

      // If user requested Transactions Only, skip executive summary cards and jump straight to ledger
      if (contentMode !== "transactions") {
        // ─────────────────────────────────────────────────────────────
        // 2. EXECUTIVE SUMMARY (4 Stat Cards)
        // ─────────────────────────────────────────────────────────────
        const cardWidth = (pageWidth - 24) / 4;
        const cardHeight = 65;

        const metrics = [
          {
            label: "TOTAL INCOME",
            value: fmtCurrency(report.summary.totalIncome),
            color: "#10B981",
            delta: report.comparison.hasPreviousData && report.comparison.incomeChangePct !== null
              ? `${report.comparison.incomeChangePct >= 0 ? "+" : ""}${report.comparison.incomeChangePct}% vs prev`
              : "Baseline period",
          },
          {
            label: "TOTAL EXPENSES",
            value: fmtCurrency(report.summary.totalExpenses),
            color: "#EF4444",
            delta: report.comparison.hasPreviousData && report.comparison.expenseChangePct !== null
              ? `${report.comparison.expenseChangePct >= 0 ? "+" : ""}${report.comparison.expenseChangePct}% vs prev`
              : "Baseline period",
          },
          {
            label: "NET CASH FLOW",
            value: fmtCurrency(report.summary.netCashFlow),
            color: report.summary.netCashFlow >= 0 ? "#10B981" : "#EF4444",
            delta: report.comparison.hasPreviousData && report.comparison.netCashFlowDiff !== null
              ? `${report.comparison.netCashFlowDiff >= 0 ? "+" : ""}${fmtCurrency(report.comparison.netCashFlowDiff)}`
              : "Baseline period",
          },
          {
            label: "SAVINGS RATE",
            value: report.summary.savingsRate !== null ? `${report.summary.savingsRate.toFixed(1)}%` : "N/A",
            color: (report.summary.savingsRate ?? 0) >= 20 ? "#10B981" : "#F59E0B",
            delta: report.summary.savingsRate !== null ? "Target benchmark: 20%" : "Zero/negative income",
          },
        ];

        metrics.forEach((m, idx) => {
          const cardX = 40 + idx * (cardWidth + 8);
          // Card background
          doc.rect(cardX, y, cardWidth, cardHeight).fillAndStroke("#F8FAFC", "#E2E8F0");

          doc.fillColor("#64748B").fontSize(7).font("Helvetica-Bold");
          doc.text(m.label, cardX + 8, y + 10, { width: cardWidth - 16 });

          doc.fillColor(m.color).fontSize(11).font("Helvetica-Bold");
          doc.text(m.value, cardX + 8, y + 24, { width: cardWidth - 16 });

          doc.fillColor("#94A3B8").fontSize(6.5).font("Helvetica");
          doc.text(m.delta, cardX + 8, y + 46, { width: cardWidth - 16 });
        });

        y += cardHeight + 20;

        // ─────────────────────────────────────────────────────────────
        // 3. TOP SPENDING BY CATEGORY
        // ─────────────────────────────────────────────────────────────
        doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold");
        doc.text("Top Expense Categories", 40, y);
        y += 16;

        if (report.spendingByCategory.length === 0) {
          doc.fillColor("#64748B").fontSize(9).font("Helvetica");
          doc.text("No expense transactions recorded in this period.", 40, y);
          y += 20;
        } else {
          // Table header
          doc.rect(40, y, pageWidth, 18).fill("#F1F5F9");
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica-Bold");
          doc.text("CATEGORY", 48, y + 5);
          doc.text("TRANSACTIONS", 200, y + 5, { width: 70, align: "right" });
          doc.text("AMOUNT", 290, y + 5, { width: 90, align: "right" });
          doc.text("SHARE", 400, y + 5, { width: 45, align: "right" });
          doc.text("ALLOCATION", 460, y + 5, { width: 45, align: "left" });
          y += 20;

          // Limit top categories for PDF summary to top 8
          const topCats = report.spendingByCategory.slice(0, 8);
          topCats.forEach((cat, idx) => {
            const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
            doc.rect(40, y, pageWidth, 18).fill(rowBg);

            doc.fillColor("#1E293B").fontSize(8).font("Helvetica");
            doc.text(cat.categoryName, 48, y + 5, { width: 145 });

            doc.fillColor("#64748B").fontSize(8).font("Helvetica");
            doc.text(String(cat.count), 200, y + 5, { width: 70, align: "right" });

            doc.fillColor("#0F172A").fontSize(8).font("Helvetica-Bold");
            doc.text(fmtCurrency(cat.amount), 290, y + 5, { width: 90, align: "right" });

            doc.fillColor("#475569").fontSize(8).font("Helvetica");
            doc.text(`${cat.percentage.toFixed(1)}%`, 400, y + 5, { width: 45, align: "right" });

            // Visual bar
            const barMaxWidth = 45;
            const barW = Math.max(2, Math.min(barMaxWidth, (cat.percentage / 100) * barMaxWidth));
            doc.rect(460, y + 6, barMaxWidth, 6).fill("#E2E8F0");
            doc.rect(460, y + 6, barW, 6).fill("#3B82F6");

            y += 18;
          });
          y += 15;
        }

        // ─────────────────────────────────────────────────────────────
        // 4. MONTH-BY-MONTH TREND (YEARLY REPORT ONLY)
        // ─────────────────────────────────────────────────────────────
        if (report.period === "yearly" && report.monthlyTrends.length > 0) {
          doc.fillColor("#0F172A").fontSize(11).font("Helvetica-Bold");
          doc.text("Month-by-Month Financial Performance", 40, y);
          y += 16;

          doc.rect(40, y, pageWidth, 18).fill("#F1F5F9");
          doc.fillColor("#475569").fontSize(7.5).font("Helvetica-Bold");
          doc.text("MONTH", 48, y + 5);
          doc.text("INCOME", 140, y + 5, { width: 80, align: "right" });
          doc.text("EXPENSES", 235, y + 5, { width: 80, align: "right" });
          doc.text("NET CASH FLOW", 330, y + 5, { width: 85, align: "right" });
          doc.text("SAVINGS RATE", 430, y + 5, { width: 75, align: "right" });
          y += 20;

          report.monthlyTrends.forEach((m, idx) => {
            const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
            doc.rect(40, y, pageWidth, 16).fill(rowBg);

            doc.fillColor("#1E293B").fontSize(7.5).font("Helvetica");
            doc.text(m.monthName, 48, y + 4);

            doc.fillColor("#10B981").fontSize(7.5).font("Helvetica");
            doc.text(fmtCurrency(m.income), 140, y + 4, { width: 80, align: "right" });

            doc.fillColor("#EF4444").fontSize(7.5).font("Helvetica");
            doc.text(fmtCurrency(m.expense), 235, y + 4, { width: 80, align: "right" });

            doc.fillColor(m.netCashFlow >= 0 ? "#0F172A" : "#EF4444").fontSize(7.5).font("Helvetica-Bold");
            doc.text(fmtCurrency(m.netCashFlow), 330, y + 4, { width: 85, align: "right" });

            doc.fillColor("#475569").fontSize(7.5).font("Helvetica");
            doc.text(m.savingsRate !== null ? `${m.savingsRate.toFixed(1)}%` : "N/A", 430, y + 4, { width: 75, align: "right" });

            y += 16;
          });
          y += 15;
        }

        // ─────────────────────────────────────────────────────────────
        // 5. BUDGETS & FINANCIAL HEALTH SUMMARY
        // ─────────────────────────────────────────────────────────────
        if (report.budgets.length > 0 || report.healthScore.isAvailable) {
          const splitWidth = (pageWidth - 16) / 2;
          const boxStartY = y;

          // Budget box
          if (report.budgets.length > 0) {
            doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold");
            doc.text("Budget Compliance", 40, y);
            y += 14;

            report.budgets.slice(0, 4).forEach((b) => {
              doc.rect(40, y, splitWidth, 20).fillAndStroke("#F8FAFC", "#E2E8F0");
              doc.fillColor("#1E293B").fontSize(7.5).font("Helvetica-Bold");
              doc.text(b.categoryName, 46, y + 5, { width: splitWidth - 80 });

              const statusColor = b.status === "EXCEEDED" ? "#EF4444" : b.status === "WARNING" ? "#F59E0B" : "#10B981";
              doc.fillColor(statusColor).fontSize(7).font("Helvetica-Bold");
              doc.text(`${b.status.replace("_", " ")} (${b.percentUsed}%)`, 40, y + 5, { width: splitWidth - 6, align: "right" });

              y += 22;
            });
          }

          // Health score box (adjacent)
          if (report.healthScore.isAvailable) {
            const healthX = 40 + splitWidth + 16;
            let hy = boxStartY;
            doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold");
            doc.text("Financial Health Assessment", healthX, hy);
            hy += 14;

            doc.rect(healthX, hy, splitWidth, 60).fillAndStroke("#F8FAFC", "#E2E8F0");
            doc.fillColor("#3B82F6").fontSize(20).font("Helvetica-Bold");
            doc.text(`${report.healthScore.score} / 100`, healthX + 12, hy + 12);

            doc.fillColor("#64748B").fontSize(8).font("Helvetica");
            doc.text(`Rating: ${report.healthScore.rating} • Period: ${report.periodLabel}`, healthX + 12, hy + 38);
          }

          y = Math.max(y, boxStartY + 75) + 15;
        }

        // ─────────────────────────────────────────────────────────────
        // 6. DATA COVERAGE AUDIT NOTES
        // ─────────────────────────────────────────────────────────────
        if (!report.dataCoverage.isComplete && report.dataCoverage.notes.length > 0) {
          doc.rect(40, y, pageWidth, 28 + report.dataCoverage.notes.length * 12).fillAndStroke("#FEF3C7", "#FCD34D");
          doc.fillColor("#92400E").fontSize(8).font("Helvetica-Bold");
          doc.text("DATA COVERAGE & INTEGRITY NOTICE:", 48, y + 6);
          y += 18;

          report.dataCoverage.notes.forEach((note) => {
            doc.fillColor("#B45309").fontSize(7.5).font("Helvetica");
            doc.text(`• ${note}`, 52, y);
            y += 12;
          });
          y += 12;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 7. TRANSACTION APPENDIX (DETAILED / TRANSACTIONS ONLY)
      // ─────────────────────────────────────────────────────────────
      if (contentMode === "detailed" || contentMode === "transactions") {
        // Start on new page if detailed report had previous sections
        if (contentMode === "detailed") {
          doc.addPage();
          y = 40;
        }

        doc.fillColor("#0F172A").fontSize(12).font("Helvetica-Bold");
        doc.text("Transaction Ledger Appendix", 40, y);
        doc.fillColor("#64748B").fontSize(8).font("Helvetica");
        doc.text(`Filtered transaction records for ${report.periodLabel} (${allTransactions.length} items)`, 40, y + 15);
        y += 32;

        const renderTxHeader = (currY: number) => {
          doc.rect(40, currY, pageWidth, 18).fill("#0F172A");
          doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
          doc.text("DATE", 46, currY + 5);
          doc.text("DESCRIPTION", 110, currY + 5);
          doc.text("CATEGORY", 290, currY + 5);
          doc.text("TYPE", 390, currY + 5);
          doc.text("AMOUNT", 440, currY + 5, { width: 68, align: "right" });
          return currY + 18;
        };

        y = renderTxHeader(y);

        if (allTransactions.length === 0) {
          doc.fillColor("#64748B").fontSize(8).font("Helvetica");
          doc.text("No transactions match the selected filter criteria.", 46, y + 10);
        } else {
          allTransactions.forEach((tx, idx) => {
            // Check page boundary
            if (y > doc.page.height - 60) {
              doc.addPage();
              y = renderTxHeader(40);
            }

            const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
            doc.rect(40, y, pageWidth, 16).fill(rowBg);

            doc.fillColor("#475569").fontSize(7).font("Helvetica");
            doc.text(tx.date, 46, y + 4);

            doc.fillColor("#0F172A").fontSize(7).font("Helvetica");
            doc.text(tx.description.slice(0, 42), 110, y + 4, { width: 175 });

            doc.fillColor("#334155").fontSize(7).font("Helvetica");
            doc.text(tx.categoryName.slice(0, 22), 290, y + 4, { width: 95 });

            const typeLabel = tx.isInternalTransfer ? "TRANSFER" : tx.type;
            const typeColor = tx.isInternalTransfer ? "#3B82F6" : tx.type === "INCOME" ? "#10B981" : "#EF4444";
            doc.fillColor(typeColor).fontSize(6.5).font("Helvetica-Bold");
            doc.text(typeLabel, 390, y + 4);

            doc.fillColor(typeColor).fontSize(7).font("Helvetica-Bold");
            doc.text(fmtCurrency(tx.amount), 440, y + 4, { width: 68, align: "right" });

            y += 16;
          });
        }
      }

      // ─────────────────────────────────────────────────────────────
      // 8. FOOTERS & PAGINATION ("Page X of Y")
      // ─────────────────────────────────────────────────────────────
      const pageRange = doc.bufferedPageRange();
      const totalPages = pageRange.count;

      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 30;

        doc.rect(40, footerY - 5, pageWidth, 0.5).fill("#E2E8F0");

        doc.fillColor("#94A3B8").fontSize(7).font("Helvetica");
        doc.text("FinSight Wealth Management • Confidential Financial Document", 40, footerY);

        doc.text(`Page ${i + 1} of ${totalPages}`, 40, footerY, {
          align: "right",
          width: pageWidth,
        });
      }

      doc.end();
    });
  },
};
