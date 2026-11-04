import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDb, disconnectDb } from './config/db';
import { AvailabilityModel } from './modules/availability/availability.model';
import { UserModel } from './modules/auth/user.model';
import { NotificationModel } from './modules/notifications/notification.model';
import { SessionModel } from './modules/sessions/session.model';
import { seedDemo } from './seed';

describe('seedDemo', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  it('inserts the demo data once and leaves later edits in place', async () => {
    expect(await seedDemo()).toBe('created');

    const priya = await UserModel.findOne({ email: 'priya.shah@example.com' }).select(
      '+passwordHash',
    );
    if (!priya) {
      throw new Error('Priya was not seeded');
    }
    const session = await SessionModel.findOne({
      'reminders.reminderId': 'seed-maya-priya-24h-member',
    });
    if (!session) {
      throw new Error('Demo session was not seeded');
    }
    const notifications = await NotificationModel.countDocuments();
    const originalStart = session.startAt.toISOString();

    await UserModel.updateOne({ _id: priya._id }, { $set: { name: 'Priya Edited' } });
    await AvailabilityModel.updateOne(
      { professionalId: priya._id },
      { $set: { intervals: [], blockedDates: ['2026-12-01'] } },
    );
    await SessionModel.updateOne({ _id: session._id }, { $set: { status: 'cancelled' } });

    expect(await seedDemo()).toBe('unchanged');

    const kept = await UserModel.findOne({ email: 'priya.shah@example.com' }).select(
      '+passwordHash',
    );
    const hours = await AvailabilityModel.findOne({ professionalId: priya._id });
    const keptSession = await SessionModel.findById(session._id);
    expect(kept?.name).toBe('Priya Edited');
    expect(kept?.passwordHash).toBe(priya.passwordHash);
    expect(hours?.intervals).toEqual([]);
    expect(hours?.blockedDates).toEqual(['2026-12-01']);
    expect(keptSession?.status).toBe('cancelled');
    expect(keptSession?.startAt.toISOString()).toBe(originalStart);
    expect(await NotificationModel.countDocuments()).toBe(notifications);
    expect(await UserModel.countDocuments()).toBe(62);
  });
});
