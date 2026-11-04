import { z } from 'zod';

const timezones = new Set<string>(Intl.supportedValuesOf('timeZone'));
timezones.add('UTC');

export function isTimezone(value: string): boolean {
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

export function browserTimezone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isTimezone(zone) ? zone : 'UTC';
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

const passwordSchema = z
  .string()
  .refine((value) => value.trim().length >= 8, 'Password must be at least 8 characters')
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Password must be at most 72 bytes',
  );

const timezoneSchema = z
  .string()
  .trim()
  .refine((value) => isTimezone(value), 'Choose a valid IANA timezone');

const nameSchema = z.string().trim().min(1, 'Enter your name').max(80);

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Enter your password')
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      'Password must be at most 72 bytes',
    ),
});

export const registerFormSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    timezone: timezoneSchema,
    role: z.enum(['member', 'professional']),
    title: z.string().trim().max(80),
    bio: z.string().trim().max(500),
  })
  .superRefine((value, context) => {
    if (value.role !== 'professional') {
      return;
    }
    if (value.title.length === 0) {
      context.addIssue({ code: 'custom', path: ['title'], message: 'Add a title' });
    }
    if (value.bio.length === 0) {
      context.addIssue({ code: 'custom', path: ['bio'], message: 'Add a short bio' });
    }
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function registerRequestBody(values: RegisterFormValues) {
  const account = {
    name: values.name,
    email: values.email,
    password: values.password,
    timezone: values.timezone,
  };
  if (values.role === 'member') {
    return { ...account, role: 'member' as const };
  }
  return { ...account, role: 'professional' as const, title: values.title, bio: values.bio };
}
