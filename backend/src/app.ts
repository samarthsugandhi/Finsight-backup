import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "@/config/env";
import authRoutes from "@/routes/auth.routes";
import transactionRoutes from "@/routes/transaction.routes";
import budgetRoutes from "@/routes/budget.routes";
import goalRoutes from "@/routes/goal.routes";
import portfolioRoutes from "@/routes/portfolio.routes";
import categoryRoutes from "@/routes/category.routes";
import healthScoreRoutes from "@/routes/health.routes";
import { errorHandler } from "@/middlewares/error.middleware";
import { apiLimiter } from "@/middlewares/rateLimiters";
import aiRoutes from "@/routes/ai.routes";
import { prisma } from "@/database/prisma";
import statementsRoutes from "@/routes/statements.routes";
import reportRoutes from "@/routes/report.routes";

const app = express();

// --- Security middleware (Core tier requirement) ---
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiLimiter);

// --- Routes ---
app.get("/api/health-check", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/health-score", healthScoreRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/statements", statementsRoutes);
app.use("/api/reports", reportRoutes);
app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use(errorHandler);

export default app;