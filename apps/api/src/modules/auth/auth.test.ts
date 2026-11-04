import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { connectDb, disconnectDb } from '../../config/db';
import { AuthSessionModel } from './session.model';
import { UserModel } from './user.model';

const password = 'correct-horse-1';

function setCookieHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join(';');
  }
  return value ?? '';
}

function member(email: string) {
  return {
    name: 'Maya Chen',
    email,
    password,
    role: 'member',
    timezone: 'America/New_York',
  };
}

describe('auth', () => {
  const app = createApp();
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  afterEach(async () => {
    await Promise.all([UserModel.deleteMany({}), AuthSessionModel.deleteMany({})]);
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  it('registers a member, sets an httpOnly cookie, and returns that member from me', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/register').send(member('Maya@Example.com'));

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({
      id: expect.any(String),
      name: 'Maya Chen',
      email: 'maya@example.com',
      role: 'member',
      timezone: 'America/New_York',
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(setCookieHeader(response.headers['set-cookie'])).toMatch(/HttpOnly/i);
    expect(setCookieHeader(response.headers['set-cookie'])).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('maya@example.com');
  });

  it('keeps a professional title and bio and does not keep a title sent by a member', async () => {
    const professional = await request(app).post('/api/auth/register').send({
      name: 'Avery Cole',
      email: 'avery@example.com',
      password,
      role: 'professional',
      timezone: 'Asia/Singapore',
      title: 'Coach',
      bio: 'Fictional coach used for tests.',
    });
    expect(professional.status).toBe(201);
    expect(professional.body.user).toMatchObject({
      role: 'professional',
      title: 'Coach',
      bio: 'Fictional coach used for tests.',
    });

    const withTitle = await request(app)
      .post('/api/auth/register')
      .send({ ...member('maya@example.com'), title: 'Should not stick' });
    expect(withTitle.status).toBe(201);
    expect(withTitle.body.user).not.toHaveProperty('title');
  });

  it('rejects a duplicate email regardless of case, including concurrent requests', async () => {
    const first = await request(app).post('/api/auth/register').send(member('maya@example.com'));
    const second = await request(app).post('/api/auth/register').send(member('MAYA@example.com'));
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('email_taken');

    const raced = await Promise.all([
      request(app).post('/api/auth/register').send(member('race@example.com')),
      request(app).post('/api/auth/register').send(member('race@example.com')),
    ]);
    expect(raced.map((response) => response.status).sort()).toEqual([201, 409]);
  });

  it('logs in with a differently cased email and ignores a user id in the body', async () => {
    const owner = await request(app).post('/api/auth/register').send(member('owner@example.com'));
    const other = await request(app).post('/api/auth/register').send(member('other@example.com'));
    const agent = request.agent(app);

    const loggedIn = await agent.post('/api/auth/login').send({
      email: '  OWNER@example.com ',
      password,
      userId: other.body.user.id,
    });

    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.user.id).toBe(owner.body.user.id);

    const me = await agent.get('/api/auth/me').query({ userId: other.body.user.id });
    expect(me.body.user.id).toBe(owner.body.user.id);
  });

  it('returns the same error for an unknown email and a wrong password', async () => {
    await request(app).post('/api/auth/register').send(member('maya@example.com'));
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'maya@example.com', password: 'not-the-password' });
    const missing = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'not-the-password' });

    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
    expect(wrong.body.error.code).toBe('invalid_credentials');
  });

  it('logs out the current session and treats a second logout as success', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(member('maya@example.com'));

    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
  });

  it('rejects an expired session and a request with no session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(member('maya@example.com'));
    await AuthSessionModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

    const expired = await agent.get('/api/auth/me');
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('unauthenticated');
    expect(await AuthSessionModel.countDocuments()).toBe(0);

    const anonymous = await request(app).get('/api/auth/me');
    expect(anonymous.status).toBe(401);
  });

  it('rejects an invalid timezone at the route', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...member('maya@example.com'), timezone: 'Not/AZone' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_error');
  });
});
