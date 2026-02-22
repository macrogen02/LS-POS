import { Router } from 'express';
import { listInventory, updateInventory } from '../controllers/inventory.controller.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();
router.get('/', requireRole('admin'), listInventory);
router.put('/:id', requireRole('admin'), updateInventory);

export default router;
