import { z } from "zod";

export const ReportQuerySchema = z
  .object({
    period: z.enum(["monthly", "yearly", "custom"]).default("monthly"),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD").optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD").optional(),
    content: z.enum(["summary", "detailed", "transactions"]).default("summary"),
    type: z.enum(["ALL", "INCOME", "EXPENSE", "TRANSFER"]).default("ALL"),
    categoryId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(5000).default(50),
  })
  .refine(
    (data) => {
      if (data.period === "custom") {
        if (!data.startDate || !data.endDate) return false;
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "For custom date range, both startDate and endDate are required, and startDate must be before or equal to endDate.",
      path: ["startDate"],
    }
  );

export type ReportQueryInput = z.infer<typeof ReportQuerySchema>;
