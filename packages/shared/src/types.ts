import type { IsoWeekday, ReminderKind, Role, SessionStatus } from './constants';

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

type UserBase = {
  id: string;
  name: string;
  timezone: string;
};

export type MemberUser = UserBase & {
  role: Extract<Role, 'member'>;
};

export type ProfessionalUser = UserBase & {
  role: Extract<Role, 'professional'>;
  title: string;
  bio: string;
};

export type PublicUser = MemberUser | ProfessionalUser;

export type AuthenticatedUser = PublicUser & {
  email: string;
};

export type ProfessionalProfile = {
  id: string;
  name: string;
  title: string;
  bio: string;
  timezone: string;
};

export type AvailabilityInterval = {
  dayOfWeek: IsoWeekday;
  startTime: string;
  endTime: string;
};

export type WeeklyAvailability = {
  intervals: AvailabilityInterval[];
  blockedDates: string[];
};

export type TimeSlot = {
  startAt: string;
  endAt: string;
};

export type SessionDto = {
  id: string;
  memberId: string;
  professionalId: string;
  memberName: string;
  professionalName: string;
  startAt: string;
  endAt: string;
  status: SessionStatus;
};

export type NotificationDto = {
  id: string;
  sessionId: string;
  kind: ReminderKind;
  message: string;
  createdAt: string;
  readAt: string | null;
};
