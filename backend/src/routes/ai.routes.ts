import { Router } from "express";
import multer from "multer";
import { aiController } from "@/controllers/ai.controller";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max audio
});

router.use(requireAuth);

router.post("/chat", aiController.chat);
router.post("/execute-action", aiController.executeAction);
router.post("/transcribe", upload.single("audio"), aiController.transcribe);

export default router;