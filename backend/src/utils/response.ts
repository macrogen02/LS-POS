import { Response } from 'express';

export const ok = (res: Response, data: unknown, message = '') =>
  res.status(200).json({ success: true, data, message });

export const fail = (res: Response, status: number, message: string, details?: unknown) =>
  res.status(status).json({ success: false, error: { code: status, message, details } });
