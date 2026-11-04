import type { SessionDto } from '@thoughtfull/shared';
import { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { isDuplicateKeyError } from '../../common/errors/mongo';
import { UserModel } from '../auth/user.model';
import { getAvailability } from '../availability/scheduling.service';
import { generateSlots, type GeneratedSlot } from '../availability/slot-generation';
import { withUserLocks } from './booking-lock';
import {
  memberChangeAllowed,
  planReminders,
  type PlannedReminder,
  type ReminderStatus,
} from './reminder-plan';
import { SessionModel } from './session.model';

const WINDOW_MESSAGE = 'You can cancel or reschedule until 24 hours before the start';

type Party = 'member' | 'professional';

function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function isReminderStatus(value: string): value is ReminderStatus {
  return (
    value === 'pending' || value === 'claimed' || value === 'delivered' || value === 'cancelled'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function keyPattern(error: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 5 || !isRecord(error)) {
    return undefined;
  }
  if (isRecord(error.keyPattern)) {
    return error.keyPattern;
  }
  return keyPattern(error.cause, depth + 1);
}

function conflictFromDuplicate(error: unknown): AppError {
  const pattern = keyPattern(error);
  if (pattern && 'memberId' in pattern) {
    return new AppError(
      409,
      'member_overlap',
      'You already have a session that overlaps that time',
    );
  }
  return new AppError(409, 'slot_unavailable', 'That time is not available');
}

function toPlanned(reminder: {
  reminderId: string;
  userId: { toString(): string };
  kind: string;
  fireAt: Date;
  status: string;
  claimToken?: string | null;
}): PlannedReminder | undefined {
  if ((reminder.kind !== '24h' && reminder.kind !== '1h') || !isReminderStatus(reminder.status)) {
    return undefined;
  }
  return {
    reminderId: reminder.reminderId,
    userId: reminder.userId.toString(),
    kind: reminder.kind,
    fireAt: reminder.fireAt,
    status: reminder.status,
    claimToken: reminder.claimToken ?? '',
  };
}

function toStored(reminder: PlannedReminder) {
  return {
    reminderId: reminder.reminderId,
    userId: new Types.ObjectId(reminder.userId),
    kind: reminder.kind,
    fireAt: reminder.fireAt,
    status: reminder.status,
    claimToken: reminder.claimToken,
  };
}

async function requireProfessional(id: string) {
  if (!isObjectId(id)) {
    throw new AppError(404, 'not_found', 'Professional not found');
  }
  const user = await UserModel.findOne({ _id: id, role: 'professional' });
  if (!user?.title || !user.bio) {
    throw new AppError(404, 'not_found', 'Professional not found');
  }
  return user;
}

async function findSession(id: string) {
  if (!isObjectId(id)) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  const session = await SessionModel.findById(id);
  if (!session) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  return session;
}

function partyRole(
  session: {
    memberId: { toString(): string };
    professionalId: { toString(): string };
  },
  actorId: string,
): Party | undefined {
  if (session.memberId.toString() === actorId) {
    return 'member';
  }
  if (session.professionalId.toString() === actorId) {
    return 'professional';
  }
  return undefined;
}

type SessionRecord = {
  _id: { toString(): string };
  memberId: { toString(): string };
  professionalId: { toString(): string };
  startAt: Date;
  endAt: Date;
  status: string;
};

async function toDtos(sessions: readonly SessionRecord[]): Promise<SessionDto[]> {
  if (sessions.length === 0) {
    return [];
  }
  const userIds = new Set(
    sessions.flatMap((session) => [session.memberId.toString(), session.professionalId.toString()]),
  );
  const users = await UserModel.find({ _id: { $in: [...userIds] } }).select('name');
  const names = new Map(users.map((user) => [user._id.toString(), user.name]));
  return sessions.map((session) => {
    if (session.status !== 'booked' && session.status !== 'cancelled') {
      throw new AppError(500, 'internal_error', 'Something went wrong');
    }
    return {
      id: session._id.toString(),
      memberId: session.memberId.toString(),
      professionalId: session.professionalId.toString(),
      memberName: names.get(session.memberId.toString()) ?? 'Member',
      professionalName: names.get(session.professionalId.toString()) ?? 'Professional',
      startAt: session.startAt.toISOString(),
      endAt: session.endAt.toISOString(),
      status: session.status,
    };
  });
}

async function toDto(session: SessionRecord): Promise<SessionDto> {
  const [dto] = await toDtos([session]);
  if (!dto) {
    throw new AppError(500, 'internal_error', 'Something went wrong');
  }
  return dto;
}

async function requireOpenSlot(input: {
  memberId: Types.ObjectId;
  memberTimezone: string;
  professionalId: Types.ObjectId;
  professionalTimezone: string;
  startAt: Date;
  now: Date;
  excludeSessionId?: Types.ObjectId;
}): Promise<GeneratedSlot> {
  const availability = await getAvailability(input.professionalId.toString());
  const bookings = await SessionModel.find({
    professionalId: input.professionalId,
    status: 'booked',
    endAt: { $gt: input.now },
    ...(input.excludeSessionId ? { _id: { $ne: input.excludeSessionId } } : {}),
  }).select('startAt endAt');
  const slot = generateSlots({
    professionalTimezone: input.professionalTimezone,
    viewerTimezone: input.memberTimezone,
    intervals: availability.intervals,
    blockedDates: availability.blockedDates,
    now: input.now,
    occupied: bookings.map((booking) => ({ startAt: booking.startAt, endAt: booking.endAt })),
  }).find((candidate) => candidate.startAt.getTime() === input.startAt.getTime());
  if (!slot) {
    throw new AppError(409, 'slot_unavailable', 'That time is not available');
  }

  const overlap = await SessionModel.exists({
    memberId: input.memberId,
    status: 'booked',
    startAt: { $lt: slot.endAt },
    endAt: { $gt: slot.startAt },
    ...(input.excludeSessionId ? { _id: { $ne: input.excludeSessionId } } : {}),
  });
  if (overlap) {
    throw new AppError(409, 'member_overlap', 'You already have a session that overlaps that time');
  }
  return slot;
}

export async function bookSession(input: {
  memberId: string;
  professionalId: string;
  startAt: Date;
  now?: Date;
}): Promise<SessionDto> {
  const now = input.now ?? new Date();
  const member = await UserModel.findOne({ _id: input.memberId, role: 'member' });
  if (!member) {
    throw new AppError(403, 'forbidden', 'Only members can book sessions');
  }
  const professional = await requireProfessional(input.professionalId);

  return withUserLocks([member._id.toString(), professional._id.toString()], async () => {
    const slot = await requireOpenSlot({
      memberId: member._id,
      memberTimezone: member.timezone,
      professionalId: professional._id,
      professionalTimezone: professional.timezone,
      startAt: input.startAt,
      now,
    });
    try {
      const created = await SessionModel.create({
        memberId: member._id,
        professionalId: professional._id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        status: 'booked',
        reminders: planReminders({
          memberId: member._id.toString(),
          professionalId: professional._id.toString(),
          startAt: slot.startAt,
          now,
        }).map(toStored),
      });
      return await toDto(created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw conflictFromDuplicate(error);
      }
      throw error;
    }
  });
}

export async function getSession(actorId: string, sessionId: string): Promise<SessionDto> {
  const session = await findSession(sessionId);
  if (!partyRole(session, actorId)) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  return toDto(session);
}

export async function listMemberSessions(
  memberId: string,
  when: 'upcoming' | 'past',
  now = new Date(),
): Promise<SessionDto[]> {
  const filter =
    when === 'upcoming'
      ? { memberId, status: 'booked' as const, endAt: { $gt: now } }
      : {
          memberId,
          $or: [
            { status: 'cancelled' as const },
            { status: 'booked' as const, endAt: { $lte: now } },
          ],
        };
  const sessions = await SessionModel.find(filter).sort(
    when === 'upcoming' ? { startAt: 1 } : { startAt: -1 },
  );
  return toDtos(sessions);
}

export async function listProfessionalSchedule(
  professionalId: string,
  now = new Date(),
): Promise<SessionDto[]> {
  const sessions = await SessionModel.find({
    professionalId,
    status: 'booked',
    endAt: { $gt: now },
  }).sort({ startAt: 1 });
  return toDtos(sessions);
}

export async function cancelSession(input: {
  actorId: string;
  sessionId: string;
  now?: Date;
}): Promise<SessionDto> {
  const now = input.now ?? new Date();
  const session = await findSession(input.sessionId);
  const role = partyRole(session, input.actorId);
  if (!role) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  if (session.status !== 'booked') {
    throw new AppError(409, 'not_booked', 'That session is no longer booked');
  }
  if (role === 'member' && !memberChangeAllowed(session.startAt, now)) {
    throw new AppError(403, 'cancellation_window', WINDOW_MESSAGE);
  }

  const reminders = session.reminders.flatMap((reminder) => {
    const planned = toPlanned(reminder);
    if (!planned) {
      return [];
    }
    if (planned.status === 'delivered') {
      return [toStored(planned)];
    }
    return [toStored({ ...planned, status: 'cancelled', claimToken: '' })];
  });
  const updated = await SessionModel.findOneAndUpdate(
    { _id: session._id, status: 'booked' },
    { $set: { status: 'cancelled', reminders } },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw new AppError(409, 'not_booked', 'That session is no longer booked');
  }
  return toDto(updated);
}

export async function rescheduleSession(input: {
  actorId: string;
  sessionId: string;
  startAt: Date;
  now?: Date;
}): Promise<SessionDto> {
  const now = input.now ?? new Date();
  const session = await findSession(input.sessionId);
  const role = partyRole(session, input.actorId);
  if (!role) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  if (role !== 'member') {
    throw new AppError(403, 'forbidden', 'Only the member can reschedule');
  }
  if (session.status !== 'booked') {
    throw new AppError(409, 'not_booked', 'That session is no longer booked');
  }
  if (!memberChangeAllowed(session.startAt, now)) {
    throw new AppError(403, 'cancellation_window', WINDOW_MESSAGE);
  }

  const member = await UserModel.findById(session.memberId);
  if (!member) {
    throw new AppError(404, 'not_found', 'Session not found');
  }
  const professional = await requireProfessional(session.professionalId.toString());

  return withUserLocks([member._id.toString(), professional._id.toString()], async () => {
    const current = await SessionModel.findById(session._id);
    if (!current || current.status !== 'booked') {
      throw new AppError(409, 'not_booked', 'That session is no longer booked');
    }
    if (!memberChangeAllowed(current.startAt, now)) {
      throw new AppError(403, 'cancellation_window', WINDOW_MESSAGE);
    }

    const slot = await requireOpenSlot({
      memberId: member._id,
      memberTimezone: member.timezone,
      professionalId: professional._id,
      professionalTimezone: professional.timezone,
      startAt: input.startAt,
      now,
      excludeSessionId: current._id,
    });
    const existing = current.reminders.flatMap((reminder) => {
      const planned = toPlanned(reminder);
      return planned ? [planned] : [];
    });
    try {
      const updated = await SessionModel.findOneAndUpdate(
        { _id: current._id, status: 'booked', startAt: current.startAt },
        {
          $set: {
            startAt: slot.startAt,
            endAt: slot.endAt,
            reminders: planReminders({
              memberId: member._id.toString(),
              professionalId: professional._id.toString(),
              startAt: slot.startAt,
              now,
              existing,
            }).map(toStored),
          },
        },
        { returnDocument: 'after' },
      );
      if (!updated) {
        throw new AppError(409, 'conflict', 'That session changed. Try again.');
      }
      return await toDto(updated);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (isDuplicateKeyError(error)) {
        throw conflictFromDuplicate(error);
      }
      throw error;
    }
  });
}
