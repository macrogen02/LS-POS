import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ok } from '../utils/response.js';

export const listInventory = async (_req: Request, res: Response) => ok(res, await prisma.inventory.findMany({ orderBy: { itemName: 'asc' } }));

export const updateInventory = async (req: Request, res: Response) => {
  const item = await prisma.inventory.update({ where: { id: req.params.id }, data: req.body });
  return ok(res, item, 'Inventory updated');
};
