import {
  SESSION_DURATION_MINUTES,
  type AvailabilityInterval,
  type IsoWeekday,
} from '@thoughtfull/shared';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { connectDb, disconnectDb } from './config/db';
import { isDuplicateKeyError } from './common/errors/mongo';
import { AvailabilityModel } from './modules/availability/availability.model';
import { replaceWeeklyHours } from './modules/availability/scheduling.service';
import { UserModel } from './modules/auth/user.model';
import { deliverDueReminders } from './modules/notifications/delivery';
import { NotificationModel } from './modules/notifications/notification.model';
import { SessionModel } from './modules/sessions/session.model';

const BCRYPT_COST = 10;
export const DEMO_PASSWORD = 'correct-horse';

const member = {
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
  timezone: 'America/New_York',
};

const professional = {
  name: 'Priya Shah',
  email: 'priya.shah@example.com',
  timezone: 'America/New_York',
  title: 'Counsellor',
  bio: 'I help people prepare for difficult conversations.',
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const HOUR_MS = 60 * 60 * 1000;
const DURATION_MS = SESSION_DURATION_MINUTES * 60 * 1000;
const SEEDED_24H_MEMBER = 'seed-maya-priya-24h-member';
const SEEDED_24H_PROFESSIONAL = 'seed-maya-priya-24h-professional';

const DIRECTORY_SIZE = 60;
const FIRST_NAMES = [
  'Avery',
  'Blair',
  'Casey',
  'Devon',
  'Ellis',
  'Finley',
  'Gray',
  'Harper',
  'Indigo',
  'Jordan',
  'Kai',
  'Logan',
  'Morgan',
  'Noor',
  'Oakley',
  'Parker',
  'Quinn',
  'Reese',
  'Shawn',
  'Taylor',
] as const;
const LAST_NAMES = ['Adeyemi', 'Bergstrom', 'Cho'] as const;
const DIRECTORY_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;
const DIRECTORY_TITLES = ['Counsellor', 'Coach', 'Therapist', 'Advisor'] as const;

const weekdays: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
const intervals: AvailabilityInterval[] = weekdays.map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
}));

function databaseUri(): string {
  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/thoughtfull-booking';
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }
  return uri;
}

async function insertAccountIfMissing(input: {
  name: string;
  email: string;
  timezone: string;
  role: 'member' | 'professional';
  title?: string;
  bio?: string;
  passwordHash: string;
}): Promise<string> {
  const existing = await UserModel.findOne({ email: input.email }).select('_id');
  if (existing) {
    return existing._id.toString();
  }
  const created = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    timezone: input.timezone,
    ...(input.role === 'professional' ? { title: input.title, bio: input.bio } : {}),
  });
  return created._id.toString();
}

function demoReminders(memberId: string, professionalId: string, startAt: Date, now: Date) {
  const dueAt = new Date(now.getTime() - 60_000);
  const oneHourAt = new Date(startAt.getTime() - HOUR_MS);
  return [
    {
      reminderId: SEEDED_24H_MEMBER,
      userId: memberId,
      kind: '24h' as const,
      fireAt: dueAt,
      status: 'pending' as const,
      claimToken: '',
    },
    {
      reminderId: SEEDED_24H_PROFESSIONAL,
      userId: professionalId,
      kind: '24h' as const,
      fireAt: dueAt,
      status: 'pending' as const,
      claimToken: '',
    },
    {
      reminderId: 'seed-maya-priya-1h-member',
      userId: memberId,
      kind: '1h' as const,
      fireAt: oneHourAt,
      status: 'pending' as const,
      claimToken: '',
    },
    {
      reminderId: 'seed-maya-priya-1h-professional',
      userId: professionalId,
      kind: '1h' as const,
      fireAt: oneHourAt,
      status: 'pending' as const,
      claimToken: '',
    },
  ];
}

async function seedReminderSession(memberId: string, professionalId: string): Promise<boolean> {
  const existing = await SessionModel.exists({ 'reminders.reminderId': SEEDED_24H_MEMBER });
  if (existing) {
    return false;
  }

  const now = new Date();
  let startAt = new Date(now.getTime() + 25 * HOUR_MS);
  let created = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await SessionModel.create({
        memberId,
        professionalId,
        startAt,
        endAt: new Date(startAt.getTime() + DURATION_MS),
        status: 'booked',
        reminders: demoReminders(memberId, professionalId, startAt, now),
      });
      created = true;
      break;
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt === 5) {
        throw error;
      }
      startAt = new Date(startAt.getTime() + DURATION_MS);
    }
  }
  if (created) {
    await deliverDueReminders(now);
  }
  return created;
}

function pick<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length];
  if (value === undefined) {
    throw new Error('Seed list is empty');
  }
  return value;
}

function directoryPeople(): Array<{
  name: string;
  email: string;
  timezone: string;
  title: string;
  bio: string;
}> {
  return Array.from({ length: DIRECTORY_SIZE }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const first = pick(FIRST_NAMES, index);
    const last = pick(LAST_NAMES, Math.floor(index / FIRST_NAMES.length));
    const title = pick(DIRECTORY_TITLES, index);
    const timezone = pick(DIRECTORY_ZONES, index);
    return {
      name: `${first} ${last}`,
      email: `directory.${number}@example.com`,
      timezone,
      title,
      bio: `I help people prepare for difficult conversations. Fictional directory profile ${number}.`,
    };
  });
}

async function seedDirectory(passwordHash: string): Promise<boolean> {
  const directoryDays: readonly IsoWeekday[] = [1, 2, 3, 4, 5];
  const weekdayHours: AvailabilityInterval[] = directoryDays.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
  }));
  const people = directoryPeople();
  const existing = await UserModel.find({
    email: { $in: people.map((person) => person.email) },
  }).select('_id email');
  const byEmail = new Map(existing.map((user) => [user.email, user._id]));
  const missing = people.filter((person) => !byEmail.has(person.email));
  if (missing.length > 0) {
    const created = await UserModel.insertMany(
      missing.map((person) => ({
        ...person,
        passwordHash,
        role: 'professional' as const,
      })),
    );
    for (const user of created) {
      byEmail.set(user.email, user._id);
    }
  }

  const ids = [...byEmail.values()];
  const savedHours = await AvailabilityModel.find({
    professionalId: { $in: ids },
  }).select('professionalId');
  const haveHours = new Set(savedHours.map((row) => row.professionalId.toString()));
  const needHours = ids.filter((id) => !haveHours.has(id.toString()));
  if (needHours.length > 0) {
    await AvailabilityModel.insertMany(
      needHours.map((professionalId) => ({
        professionalId,
        intervals: weekdayHours,
        blockedDates: [],
      })),
    );
  }
  return missing.length > 0 || needHours.length > 0;
}

async function demoDataIsComplete(): Promise<boolean> {
  const emails = directoryPeople().map((person) => person.email);
  const [maya, priya, directoryCount, session] = await Promise.all([
    UserModel.exists({ email: member.email }),
    UserModel.exists({ email: professional.email }),
    UserModel.countDocuments({ email: { $in: emails } }),
    SessionModel.exists({ 'reminders.reminderId': SEEDED_24H_MEMBER }),
  ]);
  if (!maya || !priya || directoryCount < DIRECTORY_SIZE || !session) {
    return false;
  }
  const professionalIds = await UserModel.find({
    email: { $in: [professional.email, ...emails] },
  }).select('_id');
  const hourCount = await AvailabilityModel.countDocuments({
    professionalId: { $in: professionalIds.map((user) => user._id) },
  });
  return hourCount >= DIRECTORY_SIZE + 1;
}

export async function seedDemo(): Promise<'created' | 'unchanged'> {
  if (await demoDataIsComplete()) {
    return 'unchanged';
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const memberId = await insertAccountIfMissing({ ...member, role: 'member', passwordHash });
  const professionalId = await insertAccountIfMissing({
    ...professional,
    role: 'professional',
    passwordHash,
  });
  const hours = await AvailabilityModel.exists({ professionalId });
  if (!hours) {
    await replaceWeeklyHours(professionalId, intervals);
  }
  await seedReminderSession(memberId, professionalId);
  await seedDirectory(passwordHash);
  return 'created';
}

function runningAsScript(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

async function main(): Promise<void> {
  await connectDb(databaseUri());
  try {
    const result = await seedDemo();
    if (result === 'unchanged') {
      console.log(
        'Demo data is already present. Accounts, hours, sessions, and reminders were left unchanged.',
      );
      return;
    }
    const ready = await NotificationModel.countDocuments({
      reminderId: { $in: [SEEDED_24H_MEMBER, SEEDED_24H_PROFESSIONAL] },
    });
    console.log(`Seeded ${member.email} and ${professional.email}`);
    console.log(
      `Demo 24-hour reminders are in Notifications for both accounts (${String(ready)} delivered).`,
    );
    console.log(
      `Seeded ${String(DIRECTORY_SIZE)} directory professionals at directory.01@example.com through directory.${String(DIRECTORY_SIZE)}@example.com`,
    );
  } finally {
    await disconnectDb();
  }
}

if (runningAsScript()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error(message);
    process.exitCode = 1;
  });
}
