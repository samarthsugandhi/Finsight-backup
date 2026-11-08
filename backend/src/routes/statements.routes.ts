import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '@/middlewares/auth.middleware';
import { uploadStatement, getReviewQueue, approveQueueItem, createRule } from '../controllers/statements.controller';

const router = Router();

// Protect ALL statement routes — userId is extracted from the verified JWT.
// Without this, req.userId is undefined and every upload falls back to userId=1.
router.use(requireAuth);

// Configure multer for memory storage since we process the file directly
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

router.post('/upload', upload.single('statement'), uploadStatement);
router.get('/review-queue', getReviewQueue);
router.post('/review-queue/:id/approve', approveQueueItem);
router.post('/rules', createRule);

export default router;
