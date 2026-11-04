import type {
  AvailabilityInterval,
  IsoWeekday,
  ProfessionalProfile,
  TimeSlot,
  WeeklyAvailability,
} from '@thoughtfull/shared';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { UserModel } from '../auth/user.model';
import { SessionModel } from '../sessions/session.model';
import { AvailabilityModel } from './availability.model';
import { generateSlots } from './slot-generation';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const MAX_BLOCKED_DATES = 366;

type StoredInterval = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ProfileSource = {
  _id: { toString(): string };
  name: string;
  timezone: string;
  title?: string | null;
  bio?: string | null;
};

function toProfile(user: ProfileSource): ProfessionalProfile | undefined {
  if (!user.title || !user.bio) {
    return undefined;
  }
  return {
    id: user._id.toString(),
    name: user.name,
    title: user.title,
    bio: user.bio,
    timezone: user.timezone,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toWeekday(value: number): IsoWeekday | undefined {
  return WEEKDAYS.find((day) => day === value);
}

function normalizeIntervals(intervals: readonly StoredInterval[]): AvailabilityInterval[] {
  return intervals.flatMap((interval) => {
    const dayOfWeek = toWeekday(interval.dayOfWeek);
    return dayOfWeek
      ? [{ dayOfWeek, startTime: interval.startTime, endTime: interval.endTime }]
      : [];
  });
}

function parseProfessionalId(id: string): Types.ObjectId {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(404, 'not_found', 'Professional not found');
  }
  return new Types.ObjectId(id);
}

async function requireProfessional(id: string) {
  const user = await UserModel.findOne({ _id: parseProfessionalId(id), role: 'professional' });
  if (!user || !toProfile(user)) {
    throw new AppError(404, 'not_found', 'Professional not found');
  }
  return user;
}

function toAvailability(
  doc: { intervals?: StoredInterval[] | null; blockedDates?: string[] | null } | null,
): WeeklyAvailability {
  const intervals = normalizeIntervals(doc?.intervals ?? []).sort(
    (left, right) =>
      left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime),
  );
  return {
    intervals,
    blockedDates: [...(doc?.blockedDates ?? [])].sort(),
  };
}

export async function listProfessionals(input: {
  page: number;
  pageSize: number;
  search: string;
}): Promise<{
  professionals: ProfessionalProfile[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const filter: {
    role: 'professional';
    title: { $type: 'string'; $ne: '' };
    bio: { $type: 'string'; $ne: '' };
    name?: { $regex: string; $options: 'i' };
  } = {
    role: 'professional',
    title: { $type: 'string', $ne: '' },
    bio: { $type: 'string', $ne: '' },
  };
  if (input.search.length > 0) {
    filter.name = { $regex: escapeRegex(input.search), $options: 'i' };
  }

  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ name: 1, _id: 1 })
      .skip((input.page - 1) * input.pageSize)
      .limit(input.pageSize),
    UserModel.countDocuments(filter),
  ]);

  return {
    professionals: users.flatMap((user) => {
      const profile = toProfile(user);
      return profile ? [profile] : [];
    }),
    page: input.page,
    pageSize: input.pageSize,
    total,
  };
}

export async function getProfessional(id: string): Promise<ProfessionalProfile> {
  const user = await requireProfessional(id);
  const profile = toProfile(user);
  if (!profile) {
    throw new AppError(404, 'not_found', 'Professional not found');
  }
  return profile;
}

export async function getAvailability(professionalId: string): Promise<WeeklyAvailability> {
  const doc = await AvailabilityModel.findOne({ professionalId });
  return toAvailability(doc);
}

export async function replaceWeeklyHours(
  professionalId: string,
  intervals: readonly StoredInterval[],
): Promise<WeeklyAvailability> {
  const normalized = normalizeIntervals(intervals);
  if (normalized.length !== intervals.length) {
    throw new AppError(400, 'validation_error', 'Weekday is invalid');
  }
  const doc = await AvailabilityModel.findOneAndUpdate(
    { professionalId },
    { $set: { intervals: normalized }, $setOnInsert: { blockedDates: [] } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return toAvailability(doc);
}

export async function blockDate(professionalId: string, date: string): Promise<WeeklyAvailability> {
  const existing = await AvailabilityModel.findOne({ professionalId });
  const dates = existing?.blockedDates ?? [];
  if (!dates.includes(date) && dates.length >= MAX_BLOCKED_DATES) {
    throw new AppError(400, 'validation_error', 'Too many blocked dates');
  }

  const doc = await AvailabilityModel.findOneAndUpdate(
    { professionalId },
    { $addToSet: { blockedDates: date }, $setOnInsert: { intervals: [] } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return toAvailability(doc);
}

export async function unblockDate(professionalId: string, date: string): Promise<void> {
  const doc = await AvailabilityModel.findOneAndUpdate(
    { professionalId, blockedDates: date },
    { $pull: { blockedDates: date } },
    { returnDocument: 'after' },
  );
  if (!doc) {
    throw new AppError(404, 'not_found', 'That date is not blocked');
  }
}

export async function slotsForProfessional(input: {
  professionalId: string;
  viewerTimezone: string;
  now?: Date;
}): Promise<TimeSlot[]> {
  const professional = await requireProfessional(input.professionalId);
  const availability = await getAvailability(professional._id.toString());
  const now = input.now ?? new Date();
  const bookings = await SessionModel.find({
    professionalId: professional._id,
    status: 'booked',
    endAt: { $gt: now },
  }).select('startAt endAt');
  const slots = generateSlots({
    professionalTimezone: professional.timezone,
    viewerTimezone: input.viewerTimezone,
    intervals: availability.intervals,
    blockedDates: availability.blockedDates,
    now,
    occupied: bookings.map((booking) => ({ startAt: booking.startAt, endAt: booking.endAt })),
  });
  return slots.map((slot) => ({
    startAt: slot.startAt.toISOString(),
    endAt: slot.endAt.toISOString(),
  }));
}
