import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { AppError } from '../../common/errors/app-error';
import { isDuplicateKeyError } from '../../common/errors/mongo';
import { BookingLockModel } from './booking-lock.model';

const LOCK_TTL_MS = 15_000;
const LOCK_ATTEMPTS = 30;

async function tryAcquire(key: string, owner: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + LOCK_TTL_MS);
  try {
    await BookingLockModel.create({ key, owner, expiresAt });
    return true;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const stolen = await BookingLockModel.findOneAndUpdate(
    { key, expiresAt: { $lte: new Date() } },
    { $set: { owner, expiresAt } },
    { returnDocument: 'after' },
  );
  return stolen?.owner === owner;
}

async function release(keys: readonly string[], owner: string): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await BookingLockModel.deleteMany({ key: { $in: keys }, owner });
}

export async function withUserLocks<T>(
  userIds: readonly string[],
  action: () => Promise<T>,
): Promise<T> {
  const keys = [...new Set(userIds)].sort();
  const owner = randomUUID();

  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    const acquired: string[] = [];
    for (const key of keys) {
      const ok = await tryAcquire(key, owner);
      if (!ok) {
        break;
      }
      acquired.push(key);
    }

    if (acquired.length === keys.length) {
      try {
        return await action();
      } finally {
        await release(acquired, owner);
      }
    }

    await release(acquired, owner);
    await delay(15 + attempt * 5);
  }

  throw new AppError(409, 'conflict', 'That time is being booked. Try again.');
}
