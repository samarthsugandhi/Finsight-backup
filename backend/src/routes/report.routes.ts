import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import { reportController } from "@/controllers/report.controller";

const router = Router();

// All report endpoints are strictly user-authenticated
router.use(requireAuth);

router.get("/", reportController.getReportData);
router.get("/export/pdf", reportController.exportPdf);
router.get("/export/csv", reportController.exportCsv);

export default router;
