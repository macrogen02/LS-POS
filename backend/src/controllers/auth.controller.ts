import { Request, Response } from 'express';
import { z } from 'zod';
import { login } from '../services/auth.service.js';
import { fail, ok } from '../utils/response.js';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export const loginController = async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Bad Request', parsed.error.flatten());
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result) return fail(res, 401, 'Unauthorized');
  return ok(res, result, 'Logged in');
};

export const logoutController = async (_req: Request, res: Response) => ok(res, null, 'Logged out');
