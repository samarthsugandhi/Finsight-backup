import { Router } from "express";
import { transactionController } from "@/controllers/transaction.controller";
import { validate } from "@/middlewares/validate.middleware";
import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
  linkTransferSchema,
  unlinkTransferSchema,
} from "@/validators/transaction.validator";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

router.post("/", validate(createTransactionSchema), transactionController.create);
router.get("/", validate(listTransactionsSchema), transactionController.list);
router.get("/summary", transactionController.summary);
router.get("/transfer-candidates/:id", transactionController.getTransferCandidates);
router.post("/link-transfer", validate(linkTransferSchema), transactionController.linkTransfer);
router.post("/unlink-transfer", validate(unlinkTransferSchema), transactionController.unlinkTransfer);
router.patch("/:id", validate(updateTransactionSchema), transactionController.update);
router.delete("/:id", transactionController.remove);

export default router;
