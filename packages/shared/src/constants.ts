export const SESSION_DURATION_MINUTES = 50;
export const CANCELLATION_WINDOW_HOURS = 24;
export const REMINDER_LEAD_TIMES_HOURS = [24, 1] as const;
export const REMINDER_KINDS = ['24h', '1h'] as const;
export const BOOKING_WINDOW_DAYS = 28;
export const MIN_BOOKING_NOTICE_HOURS = 2;
export const ROLES = ['member', 'professional'] as const;
export const SESSION_STATUSES = ['booked', 'cancelled'] as const;

export type Role = (typeof ROLES)[number];
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
