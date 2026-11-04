function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDuplicateKeyError(error: unknown, depth = 0): boolean {
  if (depth > 5 || !isRecord(error)) {
    return false;
  }
  if (error.code === 11000 || error.code === '11000') {
    return true;
  }
  return isDuplicateKeyError(error.cause, depth + 1);
}
