import type { ApiFieldIssue } from '@thoughtfull/shared';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly issues?: ApiFieldIssue[];

  constructor(statusCode: number, code: string, message: string, issues?: ApiFieldIssue[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (issues !== undefined) {
      this.issues = issues;
    }
  }
}
