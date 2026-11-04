import type {
  AvailabilityInterval,
  IsoWeekday,
  NotificationDto,
  ProfessionalProfile,
  SessionDto,
  SessionStatus,
  TimeSlot,
  WeeklyAvailability,
} from '@thoughtfull/shared';
import { ApiError, apiRequest } from './client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProfile(value: unknown): value is ProfessionalProfile {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.title === 'string' &&
    typeof value.bio === 'string' &&
    typeof value.timezone === 'string'
  );
}

function isSlot(value: unknown): value is TimeSlot {
  return isRecord(value) && typeof value.startAt === 'string' && typeof value.endAt === 'string';
}

function isStatus(value: unknown): value is SessionStatus {
  return value === 'booked' || value === 'cancelled';
}

function isSession(value: unknown): value is SessionDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.memberId === 'string' &&
    typeof value.professionalId === 'string' &&
    typeof value.memberName === 'string' &&
    typeof value.professionalName === 'string' &&
    typeof value.startAt === 'string' &&
    typeof value.endAt === 'string' &&
    isStatus(value.status)
  );
}

function isWeekday(value: unknown): value is IsoWeekday {
  return (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6 ||
    value === 7
  );
}

function isInterval(value: unknown): value is AvailabilityInterval {
  return (
    isRecord(value) &&
    isWeekday(value.dayOfWeek) &&
    typeof value.startTime === 'string' &&
    typeof value.endTime === 'string'
  );
}

function isAvailability(value: unknown): value is WeeklyAvailability {
  return (
    isRecord(value) &&
    Array.isArray(value.intervals) &&
    value.intervals.every(isInterval) &&
    Array.isArray(value.blockedDates) &&
    value.blockedDates.every((date) => typeof date === 'string')
  );
}

function isNotification(value: unknown): value is NotificationDto {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.sessionId === 'string' &&
    (value.kind === '24h' || value.kind === '1h') &&
    typeof value.message === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.readAt === null || typeof value.readAt === 'string')
  );
}

function unexpected(): never {
  throw new ApiError(500, 'invalid_response', 'The server returned an unexpected response.');
}

function readRecord(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    unexpected();
  }
  return payload;
}

export type ProfessionalPage = {
  professionals: ProfessionalProfile[];
  page: number;
  pageSize: number;
  total: number;
};

export async function fetchProfessionals(page: number, search: string): Promise<ProfessionalPage> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    search: search.trim().slice(0, 80),
  });
  const payload = readRecord(await apiRequest(`/api/professionals?${params.toString()}`));
  if (
    !Array.isArray(payload.professionals) ||
    !payload.professionals.every(isProfile) ||
    typeof payload.page !== 'number' ||
    typeof payload.pageSize !== 'number' ||
    payload.pageSize < 1 ||
    typeof payload.total !== 'number' ||
    payload.total < 0
  ) {
    unexpected();
  }
  return {
    professionals: payload.professionals,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
  };
}

export async function fetchProfessional(id: string): Promise<ProfessionalProfile> {
  const payload = readRecord(await apiRequest(`/api/professionals/${id}`));
  if (!isProfile(payload.professional)) {
    unexpected();
  }
  return payload.professional;
}

export async function fetchSlots(id: string): Promise<TimeSlot[]> {
  const payload = readRecord(await apiRequest(`/api/professionals/${id}/slots`));
  if (!Array.isArray(payload.slots) || !payload.slots.every(isSlot)) {
    unexpected();
  }
  return payload.slots.map((slot) => ({ startAt: slot.startAt, endAt: slot.endAt }));
}

export async function fetchAvailability(): Promise<WeeklyAvailability> {
  const payload = readRecord(await apiRequest('/api/availability/me'));
  if (!isAvailability(payload.availability)) {
    unexpected();
  }
  return {
    intervals: payload.availability.intervals.map((interval) => ({
      dayOfWeek: interval.dayOfWeek,
      startTime: interval.startTime,
      endTime: interval.endTime,
    })),
    blockedDates: [...payload.availability.blockedDates],
  };
}

export async function saveHours(
  intervals: readonly AvailabilityInterval[],
): Promise<WeeklyAvailability> {
  const payload = readRecord(
    await apiRequest('/api/availability/me', {
      method: 'PUT',
      body: JSON.stringify({ intervals }),
    }),
  );
  if (!isAvailability(payload.availability)) {
    unexpected();
  }
  return payload.availability;
}

export async function blockDate(date: string): Promise<WeeklyAvailability> {
  const payload = readRecord(
    await apiRequest('/api/availability/me/blocked-dates', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),
  );
  if (!isAvailability(payload.availability)) {
    unexpected();
  }
  return payload.availability;
}

export async function unblockDate(date: string): Promise<void> {
  await apiRequest(`/api/availability/me/blocked-dates/${date}`, { method: 'DELETE' });
}

export async function bookSession(input: {
  professionalId: string;
  startAt: string;
}): Promise<SessionDto> {
  const payload = readRecord(
    await apiRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        professionalId: input.professionalId,
        startAt: input.startAt,
      }),
    }),
  );
  if (!isSession(payload.session)) {
    unexpected();
  }
  return payload.session;
}

export async function fetchSessions(when: 'upcoming' | 'past'): Promise<SessionDto[]> {
  const payload = readRecord(await apiRequest(`/api/sessions?when=${when}`));
  if (!Array.isArray(payload.sessions) || !payload.sessions.every(isSession)) {
    unexpected();
  }
  return payload.sessions;
}

export async function fetchSchedule(): Promise<SessionDto[]> {
  const payload = readRecord(await apiRequest('/api/sessions/schedule'));
  if (!Array.isArray(payload.sessions) || !payload.sessions.every(isSession)) {
    unexpected();
  }
  return payload.sessions;
}

export async function fetchSession(id: string): Promise<SessionDto> {
  const payload = readRecord(await apiRequest(`/api/sessions/${id}`));
  if (!isSession(payload.session)) {
    unexpected();
  }
  return payload.session;
}

export async function cancelSession(id: string): Promise<SessionDto> {
  const payload = readRecord(await apiRequest(`/api/sessions/${id}/cancel`, { method: 'POST' }));
  if (!isSession(payload.session)) {
    unexpected();
  }
  return payload.session;
}

export async function rescheduleSession(id: string, startAt: string): Promise<SessionDto> {
  const payload = readRecord(
    await apiRequest(`/api/sessions/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ startAt }),
    }),
  );
  if (!isSession(payload.session)) {
    unexpected();
  }
  return payload.session;
}

export async function fetchNotifications(): Promise<NotificationDto[]> {
  const payload = readRecord(await apiRequest('/api/notifications'));
  if (!Array.isArray(payload.notifications) || !payload.notifications.every(isNotification)) {
    unexpected();
  }
  return payload.notifications;
}

export async function markNotificationRead(id: string): Promise<NotificationDto> {
  const payload = readRecord(await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' }));
  if (!isNotification(payload.notification)) {
    unexpected();
  }
  return payload.notification;
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest('/api/notifications/read-all', { method: 'POST' });
}

export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}
