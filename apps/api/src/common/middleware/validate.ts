import type { ApiFieldIssue } from '@thoughtfull/shared';
import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/app-error';

type RequestSchemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

type ValidatedInput = {
  body?: unknown;
  query?: unknown;
  params?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function currentInput(res: Response): ValidatedInput {
  const value: unknown = res.locals.validated;
  if (!isRecord(value)) {
    return {};
  }

  const input: ValidatedInput = {};
  if ('body' in value) {
    input.body = value.body;
  }
  if ('query' in value) {
    input.query = value.query;
  }
  if ('params' in value) {
    input.params = value.params;
  }
  return input;
}

function saveInput(res: Response, patch: ValidatedInput): void {
  const next: ValidatedInput = { ...currentInput(res) };
  if ('body' in patch) {
    next.body = patch.body;
  }
  if ('query' in patch) {
    next.query = patch.query;
  }
  if ('params' in patch) {
    next.params = patch.params;
  }
  res.locals.validated = next;
}

export function issuesFromZod(error: z.ZodError): ApiFieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map((part) => String(part)).join('.') : 'request',
    message: issue.message,
  }));
}

export function validate(schemas: RequestSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            'validation_error',
            'Request validation failed',
            issuesFromZod(parsed.error),
          ),
        );
        return;
      }
      saveInput(res, { body: parsed.data });
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            'validation_error',
            'Request validation failed',
            issuesFromZod(parsed.error),
          ),
        );
        return;
      }
      saveInput(res, { query: parsed.data });
    }

    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        next(
          new AppError(
            400,
            'validation_error',
            'Request validation failed',
            issuesFromZod(parsed.error),
          ),
        );
        return;
      }
      saveInput(res, { params: parsed.data });
    }

    next();
  };
}

export function validatedBody<T>(res: Response, schema: z.ZodType<T>): T {
  const value: unknown = res.locals.validated;
  const body = isRecord(value) ? value.body : undefined;
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(500, 'internal_error', 'Request was not validated');
  }
  return parsed.data;
}
