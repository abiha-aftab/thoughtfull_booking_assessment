import type { AuthenticatedUser } from '@thoughtfull/shared';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { AppError } from '../../common/errors/app-error';
import { isDuplicateKeyError } from '../../common/errors/mongo';
import type { LoginInput, RegisterInput } from './auth.schema';
import { SESSION_TTL_MS } from './auth.cookies';
import { AuthSessionModel } from './session.model';
import { UserModel } from './user.model';

const BCRYPT_COST = 10;

type AccountRecord = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  timezone: string;
  title?: string | null;
  bio?: string | null;
};

export type IssuedSession = {
  user: AuthenticatedUser;
  token: string;
  expiresAt: Date;
};

let dummyHash: Promise<string> | undefined;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function dummyPasswordHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('not-a-real-password', BCRYPT_COST);
  return dummyHash;
}

function toAuthenticatedUser(user: AccountRecord): AuthenticatedUser {
  if (user.role === 'professional') {
    if (!user.title || !user.bio) {
      throw new AppError(500, 'internal_error', 'Professional profile is incomplete');
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: 'professional',
      timezone: user.timezone,
      title: user.title,
      bio: user.bio,
    };
  }

  if (user.role !== 'member') {
    throw new AppError(500, 'internal_error', 'Account role is invalid');
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: 'member',
    timezone: user.timezone,
  };
}

async function issueSession(user: AccountRecord): Promise<IssuedSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await AuthSessionModel.create({
    tokenHash: hashToken(token),
    userId: user._id,
    expiresAt,
  });
  return { user: toAuthenticatedUser(user), token, expiresAt };
}

export async function registerUser(input: RegisterInput): Promise<IssuedSession> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      timezone: input.timezone,
      ...(input.role === 'professional' ? { title: input.title, bio: input.bio } : {}),
    });
    return await issueSession(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'email_taken', 'An account with that email already exists');
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<IssuedSession> {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user?.passwordHash) {
    await bcrypt.compare(input.password, await dummyPasswordHash());
    throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new AppError(401, 'invalid_credentials', 'Invalid email or password');
  }

  return issueSession(user);
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (token === undefined || token.length === 0) {
    return;
  }
  await AuthSessionModel.deleteOne({ tokenHash: hashToken(token) });
}

export async function userForToken(
  token: string | undefined,
): Promise<AuthenticatedUser | undefined> {
  if (token === undefined || token.length < 32) {
    return undefined;
  }

  const session = await AuthSessionModel.findOne({ tokenHash: hashToken(token) });
  if (!session) {
    return undefined;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await session.deleteOne();
    return undefined;
  }

  const user = await UserModel.findById(session.userId);
  if (!user) {
    await session.deleteOne();
    return undefined;
  }

  return toAuthenticatedUser(user);
}
