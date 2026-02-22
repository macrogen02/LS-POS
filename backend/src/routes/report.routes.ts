import { Router } from 'express';
import { dailySales, monthlyRevenue } from '../controllers/reports.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/daily-sales', requireRole('admin'), dailySales);
router.get('/monthly-revenue', requireRole('admin'), monthlyRevenue);

export default router;
