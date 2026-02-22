import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { fail, ok } from '../utils/response.js';

export const listServices = async (_req: Request, res: Response) => ok(res, await prisma.service.findMany());

export const createService = async (req: Request, res: Response) => {
  const { name, pricePerKg } = req.body;
  if (!name || Number(pricePerKg) <= 0) return fail(res, 400, 'Invalid service payload');
  const service = await prisma.service.create({ data: { name, pricePerKg: Number(pricePerKg) } });
  return ok(res, service, 'Service created');
};
