import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ok } from '../utils/response.js';

export const dailySales = async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const data = await prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: start } } });
  return ok(res, { total: Number(data._sum.amount ?? 0) });
};

export const monthlyRevenue = async (_req: Request, res: Response) => {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const grouped = await prisma.payment.groupBy({ by: ['method'], _sum: { amount: true }, where: { paidAt: { gte: start } } });
  const total = grouped.reduce((acc, g) => acc + Number(g._sum.amount ?? 0), 0);
  return ok(res, { total, byMethod: grouped });
};
