import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { browserTimezone, registerFormSchema, type RegisterFormValues } from '../auth/schemas';
import { useRegister } from '../auth/session';
import { AuthLayout } from '../components/auth-layout';
import { FormError, applyServerIssues, errorMessage } from '../components/form-error';
import { TextAreaField, TextField } from '../components/text-field';
import { TimezoneField } from '../components/timezone-field';

const timezones = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])].sort((left, right) =>
  left.localeCompare(right),
);

export function RegisterPage() {
  const registerAccount = useRegister();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      timezone: browserTimezone(),
      role: 'member',
      title: '',
      bio: '',
    },
  });
  const role = form.watch('role');

  return (
    <AuthLayout
      title="Create an account"
      lede="Join as a member to book sessions, or as a professional to publish your hours."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void form.handleSubmit(async (values) => {
            try {
              await registerAccount.mutateAsync(values);
            } catch (error: unknown) {
              applyServerIssues(error, form.setError, [
                'name',
                'email',
                'password',
                'timezone',
                'title',
                'bio',
              ]);
            }
          })(event);
        }}
        noValidate
      >
        <FormError message={registerAccount.isError ? errorMessage(registerAccount.error) : null} />
        <fieldset>
          <legend className="text-sm font-semibold">I am a</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label
              className={
                role === 'member'
                  ? 'cursor-pointer rounded-xl bg-pine px-3 py-2 text-center text-sm font-semibold text-paper'
                  : 'field cursor-pointer rounded-xl px-3 py-2 text-center text-sm font-medium'
              }
            >
              <input className="sr-only" type="radio" value="member" {...form.register('role')} />
              Member
            </label>
            <label
              className={
                role === 'professional'
                  ? 'cursor-pointer rounded-xl bg-pine px-3 py-2 text-center text-sm font-semibold text-paper'
                  : 'field cursor-pointer rounded-xl px-3 py-2 text-center text-sm font-medium'
              }
            >
              <input
                className="sr-only"
                type="radio"
                value="professional"
                {...form.register('role')}
              />
              Professional
            </label>
          </div>
        </fieldset>
        <TextField
          label="Name"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Controller
          name="timezone"
          control={form.control}
          render={({ field }) => (
            <TimezoneField
              value={field.value}
              options={timezones}
              error={form.formState.errors.timezone?.message}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {role === 'professional' ? (
          <>
            <TextField
              label="Title"
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
            <TextAreaField
              label="Bio"
              error={form.formState.errors.bio?.message}
              {...form.register('bio')}
            />
          </>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-pine px-4 py-2.5 text-sm font-semibold text-paper shadow-[0_8px_24px_rgb(61_207_155_/_0.2)] hover:bg-pine-dark disabled:opacity-60"
          disabled={registerAccount.isPending}
        >
          {registerAccount.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-mist">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-pine">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
