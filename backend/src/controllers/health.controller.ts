import { Request, Response, NextFunction } from "express";
import { healthScoreService } from "@/services/healthScore.service";

export const healthController = {
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { period, month, year, week } = req.query as {
        period?: string;
        month?: string;
        year?: string;
        week?: string;
      };
      const result = await healthScoreService.compute(req.userId!, {
        period,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        week: week ? Number(week) : undefined,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
