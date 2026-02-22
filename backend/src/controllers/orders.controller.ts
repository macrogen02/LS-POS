import { OrderStatus, PaymentMethod } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { fail, ok } from '../utils/response.js';

export const listOrders = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      include: { customer: true, items: { include: { service: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.order.count()
  ]);
  return ok(res, { items, total, page, pageSize });
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { include: { service: true } }, payments: true } });
  if (!order) return fail(res, 404, 'Not Found');
  return ok(res, order);
};

export const createOrder = async (req: Request, res: Response) => {
  const { customerId, items } = req.body as { customerId: string; items: Array<{ serviceId: string; weight: number }> };
  if (!customerId || !items?.length) return fail(res, 400, 'Invalid order payload');
  const serviceIds = items.map((i) => i.serviceId);
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  const serviceMap = new Map(services.map((s) => [s.id, Number(s.pricePerKg)]));


  const serviceNameMap = new Map(services.map((s) => [s.id, s.name.toLowerCase()]));
  const hasWash = items.some((i) => (serviceNameMap.get(i.serviceId) ?? '').includes('wash'));
  const hasDry = items.some((i) => (serviceNameMap.get(i.serviceId) ?? '').includes('dry'));
  const hasFold = items.some((i) => (serviceNameMap.get(i.serviceId) ?? '').includes('fold'));

  const isWashOnly = hasWash && !hasDry && !hasFold;
  const isDryOnly = !hasWash && hasDry && !hasFold;
  const isWashDry = hasWash && hasDry && !hasFold;
  const isWashDryFold = hasWash && hasDry && hasFold;

  if (!(isWashOnly || isDryOnly || isWashDry || isWashDryFold)) {
    return fail(res, 400, 'Invalid service combination. Allowed: wash, dry, wash+dry, wash+dry+fold');
  }

  const orderItems = items.map((i) => {
    if (i.weight <= 0) throw new Error('Weight must be > 0');
    const price = serviceMap.get(i.serviceId) ?? 0;
    return { serviceId: i.serviceId, weight: i.weight, subtotal: price * i.weight };
  });

  const total = orderItems.reduce((acc, i) => acc + i.subtotal, 0);

  const order = await prisma.order.create({
    data: {
      customerId,
      totalPrice: total,
      items: { create: orderItems }
    },
    include: { customer: true, items: { include: { service: true } }, payments: true }
  });

  return ok(res, order, 'Order created');
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const status = req.body.status as OrderStatus;
  if (!Object.values(OrderStatus).includes(status)) return fail(res, 400, 'Invalid status');

  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!order) return fail(res, 404, 'Not Found');

  const paidAmount = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  if (status === 'collected' && paidAmount < Number(order.totalPrice)) return fail(res, 400, 'Order cannot be collected without full payment');
  if (status === 'collected' && !['completed', 'ready'].includes(order.status)) return fail(res, 400, 'Cannot collect order if status is not completed or ready');

  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status } });

  if (status === 'washing') {
    await prisma.inventory.updateMany({ data: { quantity: { decrement: 1 } } });
  }

  return ok(res, updated, 'Order status updated');
};

export const addPayment = async (req: Request, res: Response) => {
  const { amount, method } = req.body as { amount: number; method: PaymentMethod };
  if (Number(amount) <= 0 || !Object.values(PaymentMethod).includes(method)) return fail(res, 400, 'Invalid payment payload');

  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { payments: true } });
  if (!order) return fail(res, 404, 'Not Found');

  const paid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const total = Number(order.totalPrice);
  if (paid + amount > total) return fail(res, 400, 'Payment amount cannot exceed total');

  const payment = await prisma.payment.create({ data: { orderId: req.params.id, amount, method } });
  return ok(res, payment, 'Payment recorded');
};
