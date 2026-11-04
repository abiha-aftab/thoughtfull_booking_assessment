import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../config/db';
import { AuthSessionModel } from '../auth/session.model';
import { UserModel } from '../auth/user.model';
import { AvailabilityModel } from '../availability/availability.model';
import { replaceWeeklyHours } from '../availability/scheduling.service';
import { BookingLockModel } from '../sessions/booking-lock.model';
import { SessionModel } from '../sessions/session.model';
import { bookSession, cancelSession } from '../sessions/session.service';
import { CLAIM_STALE_MS, deliverDueReminders } from './delivery';
import { NotificationModel } from './notification.model';

const password = 'correct-horse-1';
const hour = 60 * 60 * 1000;
const start = new Date('2026-06-01T09:00:00.000Z');
const now30 = new Date(start.getTime() - 30 * hour);
const due = new Date(start.getTime() - 30 * 60 * 1000);

describe('reminder delivery', () => {
  const app = createApp();
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
    await Promise.all([SessionModel.init(), NotificationModel.init(), BookingLockModel.init()]);
  });

  afterEach(async () => {
    await Promise.all([
      SessionModel.deleteMany({}),
      NotificationModel.deleteMany({}),
      BookingLockModel.deleteMany({}),
      AvailabilityModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
      UserModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  async function book(): Promise<{ sessionId: string; memberId: string; professionalId: string }> {
    const coach = await request(app).post('/api/auth/register').send({
      name: 'Avery Cole',
      email: 'avery@example.com',
      password,
      role: 'professional',
      timezone: 'UTC',
      title: 'Coach',
      bio: 'Fictional coach used for tests.',
    });
    const person = await request(app).post('/api/auth/register').send({
      name: 'Maya Chen',
      email: 'maya@example.com',
      password,
      role: 'member',
      timezone: 'UTC',
    });
    await replaceWeeklyHours(coach.body.user.id as string, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
    const session = await bookSession({
      memberId: person.body.user.id as string,
      professionalId: coach.body.user.id as string,
      startAt: start,
      now: now30,
    });
    return {
      sessionId: session.id,
      memberId: person.body.user.id as string,
      professionalId: coach.body.user.id as string,
    };
  }

  it('delivers each due reminder once, including after a stale claim', async () => {
    const first = await book();
    expect(await deliverDueReminders(due)).toBe(4);
    expect(await deliverDueReminders(due)).toBe(0);
    expect(await NotificationModel.countDocuments({ sessionId: first.sessionId })).toBe(4);
    const messages = await NotificationModel.find({ sessionId: first.sessionId });
    expect(new Set(messages.map((notification) => notification.reminderId)).size).toBe(4);
    expect(messages.some((notification) => notification.message.includes('Avery Cole'))).toBe(true);
    expect(messages.some((notification) => notification.message.includes('Maya Chen'))).toBe(true);

    await Promise.all([
      SessionModel.deleteMany({}),
      NotificationModel.deleteMany({}),
      UserModel.deleteMany({}),
      AvailabilityModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
    ]);
    const second = await book();
    const session = await SessionModel.findById(second.sessionId);
    expect(session).toBeTruthy();
    if (!session) {
      return;
    }
    const claimedAt = new Date(due.getTime() - CLAIM_STALE_MS - 1000);
    for (const reminder of session.reminders) {
      reminder.status = 'claimed';
      reminder.claimedAt = claimedAt;
      reminder.claimToken = 'stale-worker';
    }
    await session.save();

    expect(await deliverDueReminders(due)).toBe(4);
    expect(await deliverDueReminders(due)).toBe(0);
    expect(await NotificationModel.countDocuments({ sessionId: second.sessionId })).toBe(4);
    expect(
      (await SessionModel.findById(second.sessionId))?.reminders.every(
        (reminder) => reminder.status === 'delivered',
      ),
    ).toBe(true);
  });

  it('drops reminders that are still pending once the session has started', async () => {
    const ids = await book();
    const afterStart = new Date(start.getTime() + 60_000);

    expect(await deliverDueReminders(afterStart)).toBe(0);
    expect(await NotificationModel.countDocuments()).toBe(0);
    const session = await SessionModel.findById(ids.sessionId);
    expect(session?.reminders.map((reminder) => reminder.status)).toEqual([
      'cancelled',
      'cancelled',
      'cancelled',
      'cancelled',
    ]);
  });

  it('keeps delivered reminders when the rest of the plan goes stale', async () => {
    const ids = await book();
    const dayBefore = new Date(start.getTime() - 24 * hour);
    expect(await deliverDueReminders(dayBefore)).toBe(2);

    expect(await deliverDueReminders(new Date(start.getTime() + 60_000))).toBe(0);
    const session = await SessionModel.findById(ids.sessionId);
    const byKind = new Map(
      (session?.reminders ?? []).map((reminder) => [
        `${reminder.kind}:${reminder.userId.toString()}`,
        reminder.status,
      ]),
    );
    expect(byKind.get(`24h:${ids.memberId}`)).toBe('delivered');
    expect(byKind.get(`24h:${ids.professionalId}`)).toBe('delivered');
    expect(byKind.get(`1h:${ids.memberId}`)).toBe('cancelled');
    expect(byKind.get(`1h:${ids.professionalId}`)).toBe('cancelled');
  });

  it('does not deliver reminders for a cancelled session and keeps notifications private', async () => {
    const ids = await book();
    await cancelSession({ actorId: ids.memberId, sessionId: ids.sessionId, now: now30 });
    expect(await deliverDueReminders(due)).toBe(0);
    expect(await NotificationModel.countDocuments()).toBe(0);

    await Promise.all([
      SessionModel.deleteMany({}),
      NotificationModel.deleteMany({}),
      UserModel.deleteMany({}),
      AvailabilityModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
    ]);
    const live = await book();
    await deliverDueReminders(due);

    const memberAgent = request.agent(app);
    const coachAgent = request.agent(app);
    await memberAgent.post('/api/auth/login').send({ email: 'maya@example.com', password });
    await coachAgent.post('/api/auth/login').send({ email: 'avery@example.com', password });

    const memberNotes = await memberAgent.get('/api/notifications');
    const notes: { id: string; message: string; readAt: string | null }[] =
      memberNotes.body.notifications;
    expect(memberNotes.status).toBe(200);
    expect(notes).toHaveLength(2);
    expect(notes.every((note) => note.message.includes('Avery Cole'))).toBe(true);
    expect(notes.every((note) => note.readAt === null)).toBe(true);

    const firstId = notes[0]?.id ?? '';
    const read = await memberAgent.post(`/api/notifications/${firstId}/read`);
    expect(read.status).toBe(200);
    expect(read.body.notification.readAt).toEqual(expect.any(String));
    const again = await memberAgent.post(`/api/notifications/${firstId}/read`);
    expect(again.body.notification.readAt).toBe(read.body.notification.readAt);

    expect((await coachAgent.post(`/api/notifications/${firstId}/read`)).status).toBe(404);
    expect((await coachAgent.post('/api/notifications/read-all')).status).toBe(204);
    const coachNotes = await coachAgent.get('/api/notifications');
    const coachList: { readAt: string | null }[] = coachNotes.body.notifications;
    expect(coachList).toHaveLength(2);
    expect(coachList.every((note) => note.readAt)).toBeTruthy();

    const memberAfter = await memberAgent.get('/api/notifications');
    const memberList: { id: string; readAt: string | null }[] = memberAfter.body.notifications;
    expect(memberList.find((note) => note.id !== firstId)?.readAt).toBeNull();

    expect((await request(app).get('/api/notifications')).status).toBe(401);
    expect(live.sessionId).toBeTruthy();
  });
});
