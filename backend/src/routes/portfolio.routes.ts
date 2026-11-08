import { Router } from "express";
import multer from "multer";
import { portfolioController } from "@/controllers/portfolio.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  addHoldingSchema,
  updateHoldingSchema,
  addTransactionSchema,
  updateManualPriceSchema,
  setAllocationTargetsSchema,
  getRealizedGainsSchema,
  fdCalculatorSchema,
} from "@/validators/portfolio.validator";
import {
  calculateRecommendationSchema,
  saveRecommendationSchema,
  investmentOptionsSchema,
} from "@/validators/recommendation.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

// FD Calculator
router.post("/fd-calculator", validate(fdCalculatorSchema), portfolioController.calculateFD);

// Recommendations & Investment Options
router.post("/recommendations/options", validate(investmentOptionsSchema), portfolioController.getInvestmentOptions);
router.post("/recommendations/calculate", validate(calculateRecommendationSchema), portfolioController.calculateRecommendation);
router.get("/recommendations", portfolioController.getSavedRecommendation);
router.post("/recommendations/save", validate(saveRecommendationSchema), portfolioController.saveRecommendation);
router.get("/recommendations/compare", portfolioController.compareRecommendation);
router.post("/recommendations/compare", portfolioController.compareRecommendation);

router.get("/market-status", portfolioController.marketStatus);
router.get("/allocation-targets", portfolioController.getAllocationTargets);
router.put("/allocation-targets", validate(setAllocationTargetsSchema), portfolioController.setAllocationTargets);
router.get("/realized-gains", validate(getRealizedGainsSchema), portfolioController.getRealizedGains);

router.post("/upload-statement", upload.single("statement"), portfolioController.uploadStatement);

router.post("/", validate(addHoldingSchema), portfolioController.addHolding);
router.get("/", portfolioController.list);
router.delete("/:id", portfolioController.remove);
router.patch("/:id", validate(updateHoldingSchema), portfolioController.updateHolding);

router.post("/:id/transactions", validate(addTransactionSchema), portfolioController.addTransaction);
router.get("/:id/transactions", portfolioController.getTransactions);

router.patch("/:id/manual-price", validate(updateManualPriceSchema), portfolioController.updateManualPrice);

export default router;
