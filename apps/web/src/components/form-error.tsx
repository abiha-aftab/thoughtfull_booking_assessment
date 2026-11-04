import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/client';

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'The server could not be reached.';
}

export function applyServerIssues<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!(error instanceof ApiError)) {
    return;
  }
  for (const issue of error.issues) {
    const path = fields.find((field) => field === issue.path);
    if (path) {
      setError(path, { message: issue.message });
    }
  }
}

export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p role="alert" className="rounded-xl bg-clay-soft px-3 py-2 text-sm text-clay">
      {message}
    </p>
  );
}
