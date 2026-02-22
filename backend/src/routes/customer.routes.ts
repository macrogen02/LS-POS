import { Router } from 'express';
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from '../controllers/customers.controller.js';

const router = Router();
router.get('/', listCustomers);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
