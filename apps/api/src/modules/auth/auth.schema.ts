import { z } from 'zod';

const timezones = new Set<string>(Intl.supportedValuesOf('timeZone'));
timezones.add('UTC');

function isTimezone(value: string): boolean {
  if (timezones.has(value)) {
    return true;
  }
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

const passwordSchema = z
  .string()
  .refine((value) => value.trim().length >= 8, 'Password must be at least 8 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes');

const timezoneSchema = z
  .string()
  .trim()
  .refine((value) => isTimezone(value), 'Choose a valid IANA timezone');

const nameSchema = z.string().trim().min(1).max(80);

const memberSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('member'),
  timezone: timezoneSchema,
});

const professionalSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.literal('professional'),
  timezone: timezoneSchema,
  title: z.string().trim().min(1).max(80),
  bio: z.string().trim().min(1).max(500),
});

export const registerSchema = z.discriminatedUnion('role', [memberSchema, professionalSchema]);

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
