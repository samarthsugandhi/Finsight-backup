import { Request, Response, NextFunction } from "express";
import { ReportQuerySchema } from "@/validators/report.validator";
import { reportService } from "@/services/report.service";
import { reportPdfService } from "@/services/reportPdf.service";
import { reportCsvService } from "@/services/reportCsv.service";

function buildExportFilename(period: string, startDate: string, endDate: string, ext: "pdf" | "csv"): string {
  const cleanStart = startDate.replace(/[^\w-]/g, "");
  const cleanEnd = endDate.replace(/[^\w-]/g, "");
  return `finsight-${period}-report-${cleanStart}_to_${cleanEnd}.${ext}`;
}

export const reportController = {
  async getReportData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validated = ReportQuerySchema.parse(req.query);

      const report = await reportService.generateReport(userId, validated);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  },

  async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validated = ReportQuerySchema.parse(req.query);

      // For PDF export, retrieve up to 2000 transactions to bound memory
      const report = await reportService.generateReport(userId, {
        ...validated,
        limit: 2000,
        page: 1,
      });

      const pdfBuffer = await reportPdfService.generatePdf(
        report,
        validated.content,
        report.transactions.items
      );

      const filename = buildExportFilename(
        report.period,
        report.dateRange.startDate,
        report.dateRange.endDate,
        "pdf"
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const validated = ReportQuerySchema.parse(req.query);

      // For CSV export, retrieve up to 5000 transactions to bound memory
      const report = await reportService.generateReport(userId, {
        ...validated,
        limit: 5000,
        page: 1,
      });

      let csvContent = "";
      if (validated.content === "transactions") {
        csvContent = reportCsvService.generateTransactionsCsv(report.transactions.items);
      } else {
        csvContent = reportCsvService.generateDetailedCsv(report, report.transactions.items);
      }

      const filename = buildExportFilename(
        report.period,
        report.dateRange.startDate,
        report.dateRange.endDate,
        "csv"
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (err) {
      next(err);
    }
  },
};
