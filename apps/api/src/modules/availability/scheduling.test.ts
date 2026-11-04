import { DateTime } from 'luxon';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../config/db';
import { AuthSessionModel } from '../auth/session.model';
import { UserModel } from '../auth/user.model';
import { AvailabilityModel } from './availability.model';
import { blockDate } from './scheduling.service';

const password = 'correct-horse-1';
const week = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
}));

function professional(email: string, name = 'Avery Cole') {
  return {
    name,
    email,
    password,
    role: 'professional',
    timezone: 'Asia/Singapore',
    title: 'Coach',
    bio: 'Fictional coach used for tests.',
  };
}

function member(email: string, name = 'Maya Chen') {
  return {
    name,
    email,
    password,
    role: 'member',
    timezone: 'America/New_York',
  };
}

describe('availability and professionals', () => {
  const app = createApp();
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  afterEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      AuthSessionModel.deleteMany({}),
      AvailabilityModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  it('lets a professional replace hours and a member read free slots without private fields', async () => {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional('avery@example.com'));
    const coachAgent = request.agent(app);
    await coachAgent.post('/api/auth/login').send({ email: 'avery@example.com', password });
    const saved = await coachAgent.put('/api/availability/me').send({ intervals: week });
    expect(saved.status).toBe(200);
    expect(saved.body.availability.intervals).toHaveLength(7);

    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/register').send(member('maya@example.com'));
    const profile = await memberAgent.get(`/api/professionals/${coach.body.user.id as string}`);
    expect(profile.status).toBe(200);
    expect(profile.body.professional).toEqual({
      id: coach.body.user.id,
      name: 'Avery Cole',
      title: 'Coach',
      bio: 'Fictional coach used for tests.',
      timezone: 'Asia/Singapore',
    });
    expect(profile.body.professional).not.toHaveProperty('email');

    const slots = await memberAgent.get(`/api/professionals/${coach.body.user.id as string}/slots`);
    expect(slots.status).toBe(200);
    const slotList: { startAt: string; endAt: string }[] = slots.body.slots;
    expect(slotList.length).toBeGreaterThan(0);
    for (const slot of slotList) {
      expect(Object.keys(slot).sort()).toEqual(['endAt', 'startAt']);
      const start = new Date(slot.startAt).getTime();
      const end = new Date(slot.endAt).getTime();
      expect(end - start).toBe(50 * 60 * 1000);
      expect(start).toBeGreaterThanOrEqual(Date.now() + 2 * 60 * 60 * 1000 - 10_000);
    }
    expect(JSON.stringify(slots.body)).not.toMatch(/email|memberName|bookingId/i);

    const blockedOn = DateTime.now().setZone('Asia/Singapore').plus({ days: 3 }).toISODate();
    expect(blockedOn).toBeTruthy();
    const blocked = await coachAgent
      .post('/api/availability/me/blocked-dates')
      .send({ date: blockedOn });
    expect(blocked.status).toBe(200);
    expect(blocked.body.availability.blockedDates).toEqual([blockedOn]);

    const again = await coachAgent
      .post('/api/availability/me/blocked-dates')
      .send({ date: blockedOn });
    expect(again.status).toBe(200);
    expect(again.body.availability.blockedDates).toEqual([blockedOn]);

    const afterBlock = await memberAgent.get(
      `/api/professionals/${coach.body.user.id as string}/slots`,
    );
    expect(afterBlock.status).toBe(200);
    const openSlots: { startAt: string }[] = afterBlock.body.slots;
    expect(
      openSlots.some(
        (slot) =>
          DateTime.fromISO(slot.startAt, { zone: 'Asia/Singapore' }).toISODate() === blockedOn,
      ),
    ).toBe(false);
    expect(openSlots.length).toBeGreaterThan(0);

    const removed = await coachAgent.delete(
      `/api/availability/me/blocked-dates/${blockedOn ?? ''}`,
    );
    expect(removed.status).toBe(204);
    const missing = await coachAgent.delete(
      `/api/availability/me/blocked-dates/${blockedOn ?? ''}`,
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('not_found');
  });

  it('rejects overlapping, short, overnight, and too many intervals, and accepts a touch', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(professional('avery@example.com'));

    const overlap = await agent.put('/api/availability/me').send({
      intervals: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '13:00' },
      ],
    });
    expect(overlap.status).toBe(400);
    expect(overlap.body.error.code).toBe('validation_error');

    const touch = await agent.put('/api/availability/me').send({
      intervals: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '17:00' },
      ],
    });
    expect(touch.status).toBe(200);
    expect(touch.body.availability.intervals).toEqual([
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '12:00', endTime: '17:00' },
    ]);

    const short = await agent.put('/api/availability/me').send({
      intervals: [{ dayOfWeek: 1, startTime: '09:00', endTime: '09:49' }],
    });
    expect(short.status).toBe(400);

    const overnight = await agent.put('/api/availability/me').send({
      intervals: [{ dayOfWeek: 1, startTime: '22:00', endTime: '01:00' }],
    });
    expect(overnight.status).toBe(400);

    const cleared = await agent.put('/api/availability/me').send({ intervals: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.availability.intervals).toEqual([]);
    expect(cleared.body.availability.blockedDates).toEqual([]);

    const tooMany = await agent.put('/api/availability/me').send({
      intervals: Array.from({ length: 22 }, (_, index) => ({
        dayOfWeek: (index % 7) + 1,
        startTime: '09:00',
        endTime: '17:00',
      })),
    });
    expect(tooMany.status).toBe(400);
  });

  it('keeps blocked dates when weekly hours are replaced and rejects a date that is not real', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(professional('avery@example.com'));
    await agent.post('/api/availability/me/blocked-dates').send({ date: '2026-12-25' });

    const replaced = await agent.put('/api/availability/me').send({ intervals: [] });
    expect(replaced.status).toBe(200);
    expect(replaced.body.availability.blockedDates).toEqual(['2026-12-25']);

    const fake = await agent
      .post('/api/availability/me/blocked-dates')
      .send({ date: '2026-02-31' });
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('validation_error');
  });

  it('paginates professionals, escapes search, and hides non-professionals', async () => {
    await request(app)
      .post('/api/auth/register')
      .send(professional('cara@example.com', 'Cara Diaz'));
    await request(app)
      .post('/api/auth/register')
      .send(professional('anna@example.com', 'Anna Diaz'));
    await request(app)
      .post('/api/auth/register')
      .send(professional('beth@example.com', 'Beth Diaz'));
    await request(app).post('/api/auth/register').send(member('maya@example.com', 'Maya Diaz'));

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'maya@example.com', password });

    const page = await agent
      .get('/api/professionals')
      .query({ page: 1, pageSize: 2, search: 'diaz' });
    expect(page.status).toBe(200);
    expect(page.body.total).toBe(3);
    const firstPage: { name: string }[] = page.body.professionals;
    expect(firstPage.map((item) => item.name)).toEqual(['Anna Diaz', 'Beth Diaz']);
    expect(JSON.stringify(page.body)).not.toMatch(/example\.com/);

    const next = await agent
      .get('/api/professionals')
      .query({ page: '2', pageSize: '2', search: '  diaz  ' });
    const secondPage: { name: string }[] = next.body.professionals;
    expect(secondPage.map((item) => item.name)).toEqual(['Cara Diaz']);

    const literal = await agent.get('/api/professionals').query({ search: 'a.a' });
    expect(literal.body.professionals).toEqual([]);

    const oversized = await agent.get('/api/professionals').query({ pageSize: 51 });
    expect(oversized.status).toBe(400);

    const missing = await agent.get('/api/professionals/507f1f77bcf86cd799439011');
    expect(missing.status).toBe(404);

    const shortId = await agent.get('/api/professionals/123456789012');
    expect(shortId.status).toBe(400);
    expect(shortId.body.error.code).toBe('validation_error');
  });

  it('rejects the wrong role and a missing session', async () => {
    const memberAgent = request.agent(app);
    await memberAgent.post('/api/auth/register').send(member('maya@example.com'));
    const coachAgent = request.agent(app);
    const coach = await coachAgent
      .post('/api/auth/register')
      .send(professional('avery@example.com'));

    expect((await memberAgent.put('/api/availability/me').send({ intervals: [] })).status).toBe(
      403,
    );
    expect((await memberAgent.get('/api/availability/me')).status).toBe(403);
    expect((await coachAgent.get('/api/professionals')).status).toBe(403);
    expect(
      (await coachAgent.get(`/api/professionals/${coach.body.user.id as string}/slots`)).status,
    ).toBe(403);

    expect((await request(app).get('/api/professionals')).status).toBe(401);
    expect((await request(app).put('/api/availability/me').send({ intervals: [] })).status).toBe(
      401,
    );
  });

  it('stops at 366 blocked dates', async () => {
    const coach = await request(app)
      .post('/api/auth/register')
      .send(professional('avery@example.com'));
    const id = coach.body.user.id as string;

    for (let index = 0; index < 366; index += 1) {
      const date = DateTime.fromISO('2020-01-01', { zone: 'utc' })
        .plus({ days: index })
        .toISODate();
      expect(date).toBeTruthy();
      await blockDate(id, date ?? '');
    }

    await expect(blockDate(id, '2021-01-02')).rejects.toMatchObject({
      statusCode: 400,
      code: 'validation_error',
    });

    const stored = await AvailabilityModel.findOne({ professionalId: id });
    expect(stored?.blockedDates).toHaveLength(366);
  });
});
