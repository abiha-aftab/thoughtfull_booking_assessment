import type { ApiErrorBody } from '@thoughtfull/shared';
import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../errors/app-error';

function isDuplicateKeyError(error: unknown, depth = 0): boolean {
  if (depth > 5 || typeof error !== 'object' || error === null) {
    return false;
  }
  if ('code' in error && (error.code === 11000 || error.code === '11000')) {
    return true;
  }
  return 'cause' in error && isDuplicateKeyError(error.cause, depth + 1);
}

function httpErrorStatus(error: unknown): { status: number; type: string } | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  const type = 'type' in error && typeof error.type === 'string' ? error.type : '';
  if (status === undefined) {
    return undefined;
  }
  return { status, type };
}

function isJsonParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'body' in error;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
      },
    };
    if (error.issues !== undefined) {
      body.error.issues = error.issues;
    }
    res.status(error.statusCode).json(body);
    return;
  }

  if (isJsonParseError(error)) {
    res.status(400).json({
      error: { code: 'invalid_json', message: 'Request body must be valid JSON' },
    });
    return;
  }

  const httpError = httpErrorStatus(error);
  if (httpError?.status === 413 || httpError?.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'payload_too_large', message: 'Request body is too large' },
    });
    return;
  }
  if (httpError?.status === 415) {
    res.status(415).json({
      error: { code: 'unsupported_media_type', message: 'Unsupported content type' },
    });
    return;
  }

  if (
    error instanceof mongoose.Error.CastError ||
    error instanceof mongoose.Error.ValidationError
  ) {
    res.status(400).json({
      error: { code: 'validation_error', message: 'Request validation failed' },
    });
    return;
  }

  if (isDuplicateKeyError(error)) {
    res.status(409).json({
      error: { code: 'conflict', message: 'That record already exists' },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong' },
  });
};
