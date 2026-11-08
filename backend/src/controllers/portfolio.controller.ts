import { Request, Response, NextFunction } from "express";
import { portfolioService } from "@/services/portfolio.service";
import { recommendationService } from "@/services/recommendation.service";
import { InvestmentStatementsService } from "@/services/investmentStatements.service";
import { calculateFD as computeFD } from "@/utils/fdCalculator";
import { env } from "@/config/env";

export const portfolioController = {
  async addHolding(req: Request, res: Response, next: NextFunction) {
    try {
      const holding = await portfolioService.addHolding(req.userId!, req.body);
      res.status(201).json({ holding });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portfolioService.list(req.userId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await portfolioService.remove(req.userId!, Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async updateHolding(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portfolioService.updateHolding(req.userId!, Number(req.params.id), req.body);
      res.json({ holding: result });
    } catch (err) {
      next(err);
    }
  },

  async addTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const transaction = await portfolioService.addTransaction(req.userId!, Number(req.params.id), req.body);
      res.status(201).json({ transaction });
    } catch (err) {
      next(err);
    }
  },

  async getTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await portfolioService.getTransactions(req.userId!, Number(req.params.id));
      res.json({ transactions });
    } catch (err) {
      next(err);
    }
  },

  async updateManualPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const holding = await portfolioService.updateManualPrice(
        req.userId!,
        Number(req.params.id),
        req.body.price,
        req.body.currentValue !== undefined ? Number(req.body.currentValue) : undefined
      );
      res.json({ holding });
    } catch (err) {
      next(err);
    }
  },

  async marketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await portfolioService.getMarketStatus(req.userId!);
      res.json({
        status,
        refreshSeconds: env.MARKET_DATA_REFRESH_SECONDS,
        // Live market pricing is disabled; exchange open/close checks are not performed
        exchangeOpen: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllocationTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portfolioService.getAllocationTargets(req.userId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async setAllocationTargets(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await portfolioService.setAllocationTargets(req.userId!, req.body.targets);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getRealizedGains(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const result = await portfolioService.getRealizedGains(req.userId!, { startDate, endDate });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async uploadStatement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No statement file uploaded" });
      }

      const result = await InvestmentStatementsService.ingestStatement(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.userId!
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async calculateRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { questionnaire, investmentAmount, customRiskLevel } = req.body;
      const result = recommendationService.evaluate(
        questionnaire,
        investmentAmount,
        customRiskLevel
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async saveRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await recommendationService.savePlan(req.userId!, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getSavedRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await recommendationService.getSavedPlan(req.userId!);
      res.json({ plan: result });
    } catch (err) {
      next(err);
    }
  },

  async compareRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const targets = req.body?.targets || undefined;
      const result = await recommendationService.compareWithPortfolio(req.userId!, targets);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getInvestmentOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { riskLevel, amount, duration } = req.body;
      const result = recommendationService.generateInvestmentOptions(
        riskLevel,
        Number(amount),
        duration
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async calculateFD(req: Request, res: Response, next: NextFunction) {
    try {
      const result = computeFD(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
