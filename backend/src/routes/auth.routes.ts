import { Router } from "express";
import { authController } from "@/controllers/auth.controller";
import { validate } from "@/middlewares/validate.middleware";
import { signupSchema, loginSchema, updateProfileSchema, changePasswordSchema } from "@/validators/auth.validator";
import { authLimiter } from "@/middlewares/rateLimiters";
import { requireAuth } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/signup", authLimiter, validate(signupSchema), authController.signup);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);
router.patch("/profile", requireAuth, validate(updateProfileSchema), authController.updateProfile);
router.post("/change-password", requireAuth, authLimiter, validate(changePasswordSchema), authController.changePassword);

export default router;
