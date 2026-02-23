import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { fail, ok } from '../utils/response.js';

const nameRegex = /^[A-Za-z\s'-]+$/;
const phoneRegex = /^\d+$/;

const validateCustomerPayload = (name?: string, phone?: string) => {
  if (!name?.trim()) return 'Customer name required';
  if (!nameRegex.test(name.trim())) return 'Customer name must contain letters only';
  if (phone && !phoneRegex.test(phone)) return 'Cellphone number must contain numbers only';
  return '';
};

export const listCustomers = async (_req: Request, res: Response) =>
  ok(res, await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }));

export const createCustomer = async (req: Request, res: Response) => {
  const validation = validateCustomerPayload(req.body.name, req.body.phone);
  if (validation) return fail(res, 400, validation);

  const customer = await prisma.customer.create({
    data: {
      name: req.body.name.trim(),
      phone: req.body.phone?.trim() || undefined,
      email: req.body.email?.trim() || undefined
    }
  });

  return ok(res, customer, 'Customer created');
};

export const updateCustomer = async (req: Request, res: Response) => {
  const validation = validateCustomerPayload(req.body.name, req.body.phone);
  if (validation) return fail(res, 400, validation);

  const updated = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name.trim(),
      phone: req.body.phone?.trim() || undefined,
      email: req.body.email?.trim() || undefined
    }
  });

  return ok(res, updated, 'Customer updated');
};

export const deleteCustomer = async (req: Request, res: Response) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  return ok(res, null, 'Customer deleted');
};
