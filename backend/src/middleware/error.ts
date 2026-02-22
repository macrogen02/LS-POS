import { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/response.js';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  return fail(res, 500, 'Server Error', err);
};
