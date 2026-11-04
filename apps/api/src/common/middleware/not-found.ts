import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'not_found', `Route ${req.method} ${req.path} was not found`));
};
