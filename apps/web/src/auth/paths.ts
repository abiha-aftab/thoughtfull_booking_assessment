export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function roleLabel(role: 'member' | 'professional'): string {
  return role === 'member' ? 'Member' : 'Professional';
}

export function timezoneAbbreviation(timeZone: string, now = new Date()): string | undefined {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value;
  } catch {
    return undefined;
  }
}

export function timezoneLabel(timeZone: string, now = new Date()): string {
  const abbreviation = timezoneAbbreviation(timeZone, now);
  return abbreviation ? `${timeZone} (${abbreviation})` : timeZone;
}
