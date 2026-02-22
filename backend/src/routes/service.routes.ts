import { Router } from 'express';
import { createService, listServices } from '../controllers/services.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/', listServices);
router.post('/', requireRole('admin'), createService);

export default router;
