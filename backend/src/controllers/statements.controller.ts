import { Request, Response } from 'express';
import { StatementsService } from '../services/statements.service';
import { prisma } from "@/database/prisma";

/**
 * Safely extracts the authenticated userId from the request.
 * req.userId is set by requireAuth middleware via the verified JWT payload.
 * Returns null if somehow missing (should never happen when requireAuth is applied).
 */
function getAuthUserId(req: Request): number | null {
  return req.userId ?? null;
}

export const uploadStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: no authenticated user' });
      return;
    }

    const result = await StatementsService.processStatement(req.file.buffer, userId);
    
    res.status(200).json({
      message: 'Statement processed successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error processing statement:', error);
    res.status(500).json({ error: 'Internal server error while processing statement' });
  }
};

export const getReviewQueue = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: no authenticated user' });
      return;
    }

    const queue = await StatementsService.getReviewQueue(userId);
    
    res.status(200).json({ data: queue });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.status(500).json({ error: 'Internal server error while fetching review queue' });
  }
};

export const approveQueueItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: no authenticated user' });
      return;
    }

    const { id } = req.params;
    const { categoryId, createRule, type, sourceAccount, destinationAccount, linkedTransactionId } = req.body;

    if (!categoryId) {
      res.status(400).json({ error: 'categoryId is required' });
      return;
    }

    const transaction = await StatementsService.approveFromQueue(
      parseInt(id, 10),
      userId,
      parseInt(categoryId, 10),
      createRule,
      {
        type,
        sourceAccount,
        destinationAccount,
        linkedTransactionId: linkedTransactionId ? parseInt(linkedTransactionId, 10) : undefined,
      }
    );

    res.status(200).json({
      message: 'Transaction approved and categorized',
      data: transaction,
    });
  } catch (error: any) {
    console.error('Error approving queue item:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: no authenticated user' });
      return;
    }

    const { descriptionPattern, categoryId, exactMatch = true } = req.body;

    if (!descriptionPattern || !categoryId) {
      res.status(400).json({ error: 'descriptionPattern and categoryId are required' });
      return;
    }

    const rule = await prisma.categorizationRule.create({
      data: {
        userId,
        descriptionPattern,
        categoryId: parseInt(categoryId, 10),
        exactMatch,
      }
    });

    res.status(201).json({
      message: 'Rule created successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Internal server error while creating rule' });
  }
};
