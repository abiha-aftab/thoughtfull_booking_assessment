import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { browserTimezone, registerFormSchema, type RegisterFormValues } from '../auth/schemas';
import { useRegister } from '../auth/session';
import { AuthLayout } from '../components/auth-layout';
import { FormError, applyServerIssues, errorMessage } from '../components/form-error';
import { TextAreaField, TextField } from '../components/text-field';

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
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">I am a</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="member" {...form.register('role')} />
            Member
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="professional" {...form.register('role')} />
            Professional
          </label>
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
        <TextField
          label="Timezone"
          list="timezones"
          autoComplete="off"
          error={form.formState.errors.timezone?.message}
          {...form.register('timezone')}
        />
        <datalist id="timezones">
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
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
          className="w-full rounded-full bg-pine px-4 py-3 text-card disabled:opacity-60"
          disabled={registerAccount.isPending}
        >
          {registerAccount.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-sm text-mist">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-pine-dark">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
