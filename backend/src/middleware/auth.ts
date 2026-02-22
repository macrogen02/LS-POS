import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { fail } from '../utils/response.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return fail(res, 401, 'Unauthorized');
  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, env.jwtSecret) as Request['user'];
    next();
  } catch {
    return fail(res, 401, 'Invalid token');
  }
};

export const requireRole = (...roles: Array<'admin' | 'staff'>) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return fail(res, 403, 'Forbidden');
    next();
  };
