import rateLimit from "express-rate-limit";
import { env } from "@/config/env";

// Tighter limit on auth endpoints to blunt brute-force/credential-stuffing attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "development" ? 500 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "development" ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
