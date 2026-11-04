import type { AvailabilityInterval, IsoWeekday } from '@thoughtfull/shared';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from './config/db';
import { AvailabilityModel } from './modules/availability/availability.model';
import { replaceWeeklyHours } from './modules/availability/scheduling.service';
import { UserModel } from './modules/auth/user.model';

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
dotenv.config({ path: path.join(root, '.env') });

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

async function upsertAccount(input: {
  name: string;
  email: string;
  timezone: string;
  role: 'member' | 'professional';
  title?: string;
  bio?: string;
  passwordHash: string;
}): Promise<string> {
  const user = await UserModel.findOneAndUpdate(
    { email: input.email },
    {
      $set: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        timezone: input.timezone,
        ...(input.role === 'professional' ? { title: input.title, bio: input.bio } : {}),
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return user._id.toString();
}

export async function seedDemo(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  await upsertAccount({ ...member, role: 'member', passwordHash });
  const professionalId = await upsertAccount({
    ...professional,
    role: 'professional',
    passwordHash,
  });
  await replaceWeeklyHours(professionalId, intervals);
  await AvailabilityModel.updateOne({ professionalId }, { $set: { blockedDates: [] } });
}

async function main(): Promise<void> {
  await connectDb(databaseUri());
  try {
    await seedDemo();
    console.log(`Seeded ${member.email} and ${professional.email}`);
  } finally {
    await disconnectDb();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Seed failed';
  console.error(message);
  process.exitCode = 1;
});
