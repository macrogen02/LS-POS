import { Router } from 'express';
import { addPayment, createOrder, getOrder, listOrders, updateOrderStatus } from '../controllers/orders.controller.js';

const router = Router();
router.get('/', listOrders);
router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id/status', updateOrderStatus);
router.post('/:id/payments', addPayment);

export default router;
