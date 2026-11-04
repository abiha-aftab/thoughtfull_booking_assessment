export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function roleLabel(role: 'member' | 'professional'): string {
  return role === 'member' ? 'Member' : 'Professional';
}

export function timezoneLabel(timeZone: string, now = new Date()): string {
  try {
    const abbreviation = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value;
    return abbreviation ? `${timeZone} (${abbreviation})` : timeZone;
  } catch {
    return timeZone;
  }
}
