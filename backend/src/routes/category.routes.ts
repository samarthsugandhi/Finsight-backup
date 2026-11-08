import { Router } from "express";
import { prisma } from "@/database/prisma";
import { requireAuth } from "@/middlewares/auth.middleware";
import { TransactionType } from "@prisma/client";

const router = Router();

/**
 * GET /api/categories
 * Returns all categories with their type (INCOME or EXPENSE),
 * along with a `grouped` object ({ income: Category[], expense: Category[] }).
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    const grouped = {
      income: categories.filter((c) => c.type === TransactionType.INCOME),
      expense: categories.filter((c) => c.type === TransactionType.EXPENSE),
      transfer: categories.filter((c) => c.type === TransactionType.TRANSFER),
    };
    res.json({ categories, grouped });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/categories
 * Allows creating a new custom category with automatic type inheritance.
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, type } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "Category name is required" });
      return;
    }
    let cleanType: TransactionType = TransactionType.EXPENSE;
    if (type === "INCOME" || type === TransactionType.INCOME) {
      cleanType = TransactionType.INCOME;
    } else if (type === "TRANSFER" || type === TransactionType.TRANSFER) {
      cleanType = TransactionType.TRANSFER;
    }
    const cleanName = name.trim();

    const category = await prisma.category.upsert({
      where: { name: cleanName },
      update: { type: cleanType },
      create: { name: cleanName, type: cleanType },
    });

    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

export default router;
