import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../config/db';
import { AuthSessionModel } from '../auth/session.model';
import { UserModel } from '../auth/user.model';
import { AvailabilityModel } from '../availability/availability.model';
import { blockDate, replaceWeeklyHours } from '../availability/scheduling.service';
import { deliverDueReminders } from '../notifications/delivery';
import { NotificationModel } from '../notifications/notification.model';
import { BookingLockModel } from './booking-lock.model';
import { SessionModel } from './session.model';
import { bookSession, cancelSession, rescheduleSession } from './session.service';

const password = 'correct-horse-1';
const hour = 60 * 60 * 1000;
const start = new Date('2026-06-01T09:00:00.000Z');
const later = new Date('2026-06-01T09:50:00.000Z');
const overlapStart = new Date('2026-06-01T09:25:00.000Z');
const touchingStart = new Date('2026-06-01T10:15:00.000Z');
const now30 = new Date(start.getTime() - 30 * hour);
const week = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
}));

function professional(email: string, name = 'Avery Cole', timezone = 'UTC') {
  return {
    name,
    email,
    password,
    role: 'professional',
    timezone,
    title: 'Coach',
    bio: 'Fictional coach used for tests.',
  };
}

function member(email: string, name = 'Maya Chen', timezone = 'UTC') {
  return { name, email, password, role: 'member', timezone };
}

type StoredReminder = {
  reminderId: string;
  kind: string;
  status: string;
  fireAt: string;
};

async function snapshot(
  id: string,
): Promise<{ status: string; startAt: string; reminders: StoredReminder[] }> {
  const doc = await SessionModel.findById(id);
  if (!doc) {
    throw new Error('missing session');
  }
  return {
    status: doc.status,
    startAt: doc.startAt.toISOString(),
    reminders: doc.reminders.map((reminder) => ({
      reminderId: reminder.reminderId,
      kind: reminder.kind,
      status: reminder.status,
      fireAt: reminder.fireAt.toISOString(),
    })),
  };
}

describe('sessions', () => {
  const app = createApp();
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
    await Promise.all([SessionModel.init(), BookingLockModel.init(), NotificationModel.init()]);
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

  async function setupPair(
    memberEmail = 'maya@example.com',
    professionalEmail = 'avery@example.com',
  ) {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional(professionalEmail));
    const person = await request(app).post('/api/auth/register').send(member(memberEmail));
    await replaceWeeklyHours(coach.body.user.id as string, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);
    return {
      memberId: person.body.user.id as string,
      professionalId: coach.body.user.id as string,
    };
  }

  it('books a free slot, hides it, and keeps one session when two members race', async () => {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional('avery@example.com'));
    const maya = request.agent(app);
    const nia = request.agent(app);
    await maya.post('/api/auth/register').send(member('maya@example.com'));
    await nia.post('/api/auth/register').send(member('nia@example.com', 'Nia Cole'));
    await replaceWeeklyHours(coach.body.user.id as string, week);

    const listed = await maya.get(`/api/professionals/${coach.body.user.id as string}/slots`);
    const slots: { startAt: string; endAt: string }[] = listed.body.slots;
    const choice = slots.find((slot) => new Date(slot.startAt).getTime() >= Date.now() + 30 * hour);
    expect(choice).toBeTruthy();
    if (!choice) {
      return;
    }

    const booked = await maya.post('/api/sessions').send({
      professionalId: coach.body.user.id,
      startAt: choice.startAt,
      memberId: '507f1f77bcf86cd799439011',
    });
    expect(booked.status).toBe(201);
    expect(booked.body.session.memberId).toBeDefined();
    expect(booked.body.session.memberId).not.toBe('507f1f77bcf86cd799439011');
    expect(booked.body.session.professionalName).toBe('Avery Cole');
    expect(JSON.stringify(booked.body)).not.toMatch(/example\.com|password/);

    const after = await maya.get(`/api/professionals/${coach.body.user.id as string}/slots`);
    const remaining: { startAt: string; endAt: string }[] = after.body.slots;
    expect(remaining.some((slot) => slot.startAt === choice.startAt)).toBe(false);
    for (const slot of remaining) {
      expect(Object.keys(slot).sort()).toEqual(['endAt', 'startAt']);
    }

    const conflict = await nia.post('/api/sessions').send({
      professionalId: coach.body.user.id,
      startAt: choice.startAt,
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe('slot_unavailable');
  });

  it('keeps a single booked session when two members submit the same slot together', async () => {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional('avery@example.com'));
    const one = await request(app)
      .post('/api/auth/register')
      .send(member('one@example.com', 'One Lane'));
    const two = await request(app)
      .post('/api/auth/register')
      .send(member('two@example.com', 'Two Lane'));
    await replaceWeeklyHours(coach.body.user.id as string, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
    ]);

    const results = await Promise.allSettled([
      bookSession({
        memberId: one.body.user.id as string,
        professionalId: coach.body.user.id as string,
        startAt: start,
        now: now30,
      }),
      bookSession({
        memberId: two.body.user.id as string,
        professionalId: coach.body.user.id as string,
        startAt: start,
        now: now30,
      }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : undefined).toMatchObject({
      statusCode: 409,
    });
    expect(
      await SessionModel.countDocuments({
        professionalId: coach.body.user.id,
        startAt: start,
        status: 'booked',
      }),
    ).toBe(1);
    expect(await BookingLockModel.countDocuments()).toBe(0);
  });

  it('rejects overlap, a short notice, an off-grid time, and a blocked date', async () => {
    const primary = await setupPair();
    const other = await request(app)
      .post('/api/auth/register')
      .send(professional('blair@example.com', 'Blair Diaz'));
    await replaceWeeklyHours(other.body.user.id as string, [
      { dayOfWeek: 1, startTime: '09:25', endTime: '11:15' },
    ]);

    const first = await bookSession({
      memberId: primary.memberId,
      professionalId: primary.professionalId,
      startAt: start,
      now: now30,
    });
    expect(first.endAt).toBe('2026-06-01T09:50:00.000Z');
    expect(
      (await SessionModel.findById(first.id))?.reminders.filter(
        (reminder) => reminder.status === 'pending',
      ),
    ).toHaveLength(4);

    await expect(
      bookSession({
        memberId: primary.memberId,
        professionalId: other.body.user.id as string,
        startAt: overlapStart,
        now: now30,
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'member_overlap' });

    const beside = await bookSession({
      memberId: primary.memberId,
      professionalId: other.body.user.id as string,
      startAt: touchingStart,
      now: now30,
    });
    expect(beside.startAt).toBe(touchingStart.toISOString());

    await expect(
      bookSession({
        memberId: primary.memberId,
        professionalId: primary.professionalId,
        startAt: new Date('2026-06-01T09:15:00.000Z'),
        now: now30,
      }),
    ).rejects.toMatchObject({ code: 'slot_unavailable' });

    await expect(
      bookSession({
        memberId: primary.memberId,
        professionalId: primary.professionalId,
        startAt: later,
        now: new Date(later.getTime() - 2 * hour + 1),
      }),
    ).rejects.toMatchObject({ code: 'slot_unavailable' });

    const exactNotice = await bookSession({
      memberId: (
        await request(app).post('/api/auth/register').send(member('late@example.com', 'Late Lane'))
      ).body.user.id as string,
      professionalId: primary.professionalId,
      startAt: later,
      now: new Date(later.getTime() - 2 * hour),
    });
    expect(exactNotice.startAt).toBe(later.toISOString());
    expect(
      (await SessionModel.findById(exactNotice.id))?.reminders
        .map((reminder) => reminder.kind)
        .sort(),
    ).toEqual(['1h', '1h']);

    await blockDate(primary.professionalId, '2026-06-08');
    await expect(
      bookSession({
        memberId: primary.memberId,
        professionalId: primary.professionalId,
        startAt: new Date('2026-06-08T09:00:00.000Z'),
        now: now30,
      }),
    ).rejects.toMatchObject({ code: 'slot_unavailable' });
  });

  it('lets a member change a session at exactly 24 hours and refuses one millisecond inside', async () => {
    const ids = await setupPair();
    const booked = await bookSession({ ...ids, startAt: start, now: now30 });
    const before = await snapshot(booked.id);
    const inside = new Date(start.getTime() - 24 * hour + 1);

    await expect(
      cancelSession({ actorId: ids.memberId, sessionId: booked.id, now: inside }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'cancellation_window',
      message: 'You can cancel or reschedule until 24 hours before the start',
    });
    await expect(
      rescheduleSession({
        actorId: ids.memberId,
        sessionId: booked.id,
        startAt: later,
        now: inside,
      }),
    ).rejects.toMatchObject({ code: 'cancellation_window' });
    expect(await snapshot(booked.id)).toEqual(before);

    const other = await request(app)
      .post('/api/auth/register')
      .send(member('nia@example.com', 'Nia Cole'));
    await bookSession({
      memberId: other.body.user.id as string,
      professionalId: ids.professionalId,
      startAt: later,
      now: now30,
    });
    await expect(
      rescheduleSession({
        actorId: ids.memberId,
        sessionId: booked.id,
        startAt: later,
        now: now30,
      }),
    ).rejects.toMatchObject({ code: 'slot_unavailable' });
    expect(await snapshot(booked.id)).toEqual(before);

    const deadline = new Date(start.getTime() - 24 * hour);
    await deliverDueReminders(deadline);
    const moved = await rescheduleSession({
      actorId: ids.memberId,
      sessionId: booked.id,
      startAt: new Date('2026-06-01T10:40:00.000Z'),
      now: deadline,
    });
    expect(moved.id).toBe(booked.id);
    expect(moved.startAt).toBe('2026-06-01T10:40:00.000Z');
    const afterMove = await snapshot(booked.id);
    const deliveredBefore = before.reminders
      .filter((reminder) => reminder.kind === '24h')
      .map((reminder) => reminder.reminderId)
      .sort();
    expect(
      afterMove.reminders
        .filter((reminder) => reminder.status === 'delivered')
        .map((reminder) => reminder.reminderId)
        .sort(),
    ).toEqual(deliveredBefore);
    expect(
      afterMove.reminders.some(
        (reminder) => reminder.status === 'pending' && reminder.kind === '1h',
      ),
    ).toBe(true);

    const fresh = await bookSession({
      memberId: ids.memberId,
      professionalId: ids.professionalId,
      startAt: new Date('2026-06-01T11:30:00.000Z'),
      now: now30,
    });
    const freshDeadline = new Date(new Date(fresh.startAt).getTime() - 24 * hour);
    await deliverDueReminders(freshDeadline);
    const cancelled = await cancelSession({
      actorId: ids.memberId,
      sessionId: fresh.id,
      now: freshDeadline,
    });
    expect(cancelled.status).toBe('cancelled');
    const afterCancel = await snapshot(fresh.id);
    expect(
      afterCancel.reminders
        .filter((reminder) => reminder.kind === '24h')
        .every((reminder) => reminder.status === 'delivered'),
    ).toBe(true);
    expect(
      afterCancel.reminders
        .filter((reminder) => reminder.kind === '1h')
        .every((reminder) => reminder.status === 'cancelled'),
    ).toBe(true);
    const notificationCount = await NotificationModel.countDocuments({ sessionId: fresh.id });
    await deliverDueReminders(new Date(fresh.startAt));
    expect(await NotificationModel.countDocuments({ sessionId: fresh.id })).toBe(notificationCount);
  });

  it('lets a professional cancel inside the window, including a session that already started', async () => {
    const ids = await setupPair();
    const booked = await bookSession({ ...ids, startAt: start, now: now30 });
    const coach = request.agent(app);
    const person = request.agent(app);
    await coach.post('/api/auth/login').send({ email: 'avery@example.com', password });
    await person.post('/api/auth/login').send({ email: 'maya@example.com', password });

    const memberCancel = await person.post(`/api/sessions/${booked.id}/cancel`);
    expect(memberCancel.status).toBe(403);
    expect(memberCancel.body.error.code).toBe('cancellation_window');
    expect((await SessionModel.findById(booked.id))?.status).toBe('booked');

    const professionalCancel = await coach.post(`/api/sessions/${booked.id}/cancel`);
    expect(professionalCancel.status).toBe(200);
    expect(professionalCancel.body.session.status).toBe('cancelled');
    expect(professionalCancel.body.session.memberName).toBe('Maya Chen');

    const again = await coach.post(`/api/sessions/${booked.id}/cancel`);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('not_booked');

    const started = await bookSession({
      ...ids,
      startAt: new Date('2026-06-01T10:40:00.000Z'),
      now: now30,
    });
    const during = await cancelSession({
      actorId: ids.professionalId,
      sessionId: started.id,
      now: new Date('2026-06-01T10:50:00.000Z'),
    });
    expect(during.status).toBe('cancelled');
  });

  it('shows members their own upcoming and past sessions and professionals only their upcoming schedule', async () => {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional('avery@example.com'));
    const maya = request.agent(app);
    const nia = request.agent(app);
    const professionalAgent = request.agent(app);
    await maya.post('/api/auth/register').send(member('maya@example.com'));
    await nia.post('/api/auth/register').send(member('nia@example.com', 'Nia Cole'));
    await professionalAgent.post('/api/auth/login').send({ email: 'avery@example.com', password });
    await replaceWeeklyHours(coach.body.user.id as string, week);

    const listed = await maya.get(`/api/professionals/${coach.body.user.id as string}/slots`);
    const slots: { startAt: string }[] = listed.body.slots;
    const choice = slots.find((slot) => new Date(slot.startAt).getTime() >= Date.now() + 30 * hour);
    expect(choice).toBeTruthy();
    if (!choice) {
      return;
    }
    const booked = await maya.post('/api/sessions').send({
      professionalId: coach.body.user.id,
      startAt: choice.startAt,
    });
    const sessionId = booked.body.session.id as string;

    const schedule = await professionalAgent.get('/api/sessions/schedule');
    expect(schedule.status).toBe(200);
    expect(schedule.body.sessions).toEqual([
      expect.objectContaining({ id: sessionId, memberName: 'Maya Chen', status: 'booked' }),
    ]);
    expect(JSON.stringify(schedule.body)).not.toMatch(/example\.com/);

    expect((await maya.get('/api/sessions/schedule')).status).toBe(403);
    expect((await professionalAgent.get('/api/sessions').query({ when: 'upcoming' })).status).toBe(
      403,
    );
    expect((await request(app).get('/api/sessions').query({ when: 'upcoming' })).status).toBe(401);
    expect((await maya.get('/api/sessions')).status).toBe(400);
    expect((await nia.get(`/api/sessions/${sessionId}`)).status).toBe(404);
    expect((await maya.get(`/api/sessions/${sessionId}`)).body.session.id).toBe(sessionId);
    expect(
      (
        await professionalAgent
          .post(`/api/sessions/${sessionId}/reschedule`)
          .send({ startAt: choice.startAt })
      ).status,
    ).toBe(403);

    const cancelled = await maya.post(`/api/sessions/${sessionId}/cancel`);
    expect(cancelled.status).toBe(200);
    const upcoming = await maya.get('/api/sessions').query({ when: 'upcoming' });
    const past = await maya.get('/api/sessions').query({ when: 'past' });
    const pastSessions: { id: string }[] = past.body.sessions;
    expect(upcoming.body.sessions).toEqual([]);
    expect(pastSessions.map((session) => session.id)).toEqual([sessionId]);
    expect((await professionalAgent.get('/api/sessions/schedule')).body.sessions).toEqual([]);

    const rebooked = await maya.post('/api/sessions').send({
      professionalId: coach.body.user.id,
      startAt: choice.startAt,
    });
    expect(rebooked.status).toBe(201);
  });

  it('keeps the booked unique indexes from accepting a second active session at the same start', async () => {
    const ids = await setupPair();
    const other = await request(app)
      .post('/api/auth/register')
      .send(member('nia@example.com', 'Nia Cole'));
    await SessionModel.create({
      memberId: ids.memberId,
      professionalId: ids.professionalId,
      startAt: start,
      endAt: later,
      status: 'booked',
      reminders: [],
    });
    await expect(
      SessionModel.create({
        memberId: other.body.user.id,
        professionalId: ids.professionalId,
        startAt: start,
        endAt: later,
        status: 'booked',
        reminders: [],
      }),
    ).rejects.toMatchObject({ code: 11000 });
    await SessionModel.create({
      memberId: other.body.user.id,
      professionalId: ids.professionalId,
      startAt: start,
      endAt: later,
      status: 'cancelled',
      reminders: [],
    });
    expect(await SessionModel.countDocuments({ startAt: start })).toBe(2);
  });
});
