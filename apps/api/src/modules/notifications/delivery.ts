import type { NotificationDto, ReminderKind } from '@thoughtfull/shared';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { isDuplicateKeyError } from '../../common/errors/mongo';
import { UserModel } from '../auth/user.model';
import { reminderMessage } from '../sessions/reminder-plan';
import { SessionModel } from '../sessions/session.model';
import { NotificationModel } from './notification.model';

export const CLAIM_STALE_MS = 60_000;

function isKind(value: string): value is ReminderKind {
  return value === '24h' || value === '1h';
}

async function otherName(
  session: { memberId: { toString(): string }; professionalId: { toString(): string } },
  userId: string,
): Promise<string> {
  const otherId =
    userId === session.memberId.toString() ? session.professionalId : session.memberId;
  const user = await UserModel.findById(otherId).select('name');
  return user?.name ?? 'the other person';
}

export async function deliverDueReminders(now = new Date()): Promise<number> {
  const staleBefore = new Date(now.getTime() - CLAIM_STALE_MS);
  await SessionModel.updateMany(
    { 'reminders.status': 'claimed' },
    {
      $set: {
        'reminders.$[reminder].status': 'pending',
        'reminders.$[reminder].claimToken': '',
      },
    },
    {
      arrayFilters: [{ 'reminder.status': 'claimed', 'reminder.claimedAt': { $lte: staleBefore } }],
    },
  );

  let delivered = 0;
  for (let count = 0; count < 500; count += 1) {
    const token = randomUUID();
    const session = await SessionModel.findOneAndUpdate(
      {
        status: 'booked',
        reminders: { $elemMatch: { status: 'pending', fireAt: { $lte: now } } },
      },
      {
        $set: {
          'reminders.$.status': 'claimed',
          'reminders.$.claimToken': token,
          'reminders.$.claimedAt': now,
        },
      },
      { returnDocument: 'after' },
    );
    if (!session) {
      break;
    }

    const reminder = session.reminders.find((item) => item.claimToken === token);
    if (!reminder || !isKind(reminder.kind)) {
      continue;
    }

    const stillClaimed = await SessionModel.exists({
      _id: session._id,
      status: 'booked',
      reminders: {
        $elemMatch: { reminderId: reminder.reminderId, status: 'claimed', claimToken: token },
      },
    });
    if (!stillClaimed) {
      continue;
    }

    const userId = reminder.userId.toString();
    try {
      await NotificationModel.create({
        reminderId: reminder.reminderId,
        userId: new Types.ObjectId(userId),
        sessionId: session._id,
        kind: reminder.kind,
        message: reminderMessage(reminder.kind, await otherName(session, userId)),
      });
      delivered += 1;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    await SessionModel.updateOne(
      {
        _id: session._id,
        reminders: {
          $elemMatch: { reminderId: reminder.reminderId, status: 'claimed', claimToken: token },
        },
      },
      { $set: { 'reminders.$.status': 'delivered', 'reminders.$.claimToken': '' } },
    );
  }

  return delivered;
}

export function startReminderPoller(intervalMs = 15_000): () => void {
  const run = (): void => {
    void deliverDueReminders().catch(() => {
      console.error('Reminder delivery failed');
    });
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => {
    clearInterval(timer);
  };
}

export function toNotificationDto(doc: {
  _id: { toString(): string };
  sessionId: { toString(): string };
  kind: string;
  message: string;
  createdAt?: Date;
  readAt?: Date | null;
}): NotificationDto | undefined {
  if (!isKind(doc.kind) || !doc.createdAt) {
    return undefined;
  }
  return {
    id: doc._id.toString(),
    sessionId: doc.sessionId.toString(),
    kind: doc.kind,
    message: doc.message,
    createdAt: doc.createdAt.toISOString(),
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
  };
}
