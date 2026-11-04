const CREDENTIALS = /mongodb(?:\+srv)?:\/\/[^/\s]+/gi;

export function databaseFailureMessage(error: unknown, uri: string): string {
  const message = error instanceof Error ? error.message : 'Unknown database error';
  const withoutUri = uri.length > 0 ? message.split(uri).join('[redacted]') : message;
  return withoutUri.replace(CREDENTIALS, 'mongodb://[redacted]');
}
