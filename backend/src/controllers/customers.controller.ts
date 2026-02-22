import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { fail, ok } from '../utils/response.js';

export const listCustomers = async (_req: Request, res: Response) => ok(res, await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } }));

export const createCustomer = async (req: Request, res: Response) => {
  if (!req.body.name) return fail(res, 400, 'Customer name required');
  const customer = await prisma.customer.create({ data: { name: req.body.name, phone: req.body.phone, email: req.body.email } });
  return ok(res, customer, 'Customer created');
};

export const updateCustomer = async (req: Request, res: Response) => {
  const updated = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, updated, 'Customer updated');
};

export const deleteCustomer = async (req: Request, res: Response) => {
  await prisma.customer.delete({ where: { id: req.params.id } });
  return ok(res, null, 'Customer deleted');
};
